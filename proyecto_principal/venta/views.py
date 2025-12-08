from django.shortcuts import render, redirect, get_object_or_404
from django.contrib import messages
from django.http import JsonResponse, HttpResponse, FileResponse
from home.models import Venta, Producto, Codigo, DetalleVenta, Categoria, Reembolso, ReembolsoDetalle, ConfiguracionBoleta, Sucursal
from .forms import VentaForm, DetalleVentaForm
from decimal import Decimal
from django.db import transaction
from django.forms import modelformset_factory
from django.views.decorators.http import require_POST, require_GET, require_http_methods
from django.core.paginator import Paginator
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth import get_user_model
from django.db.models import Q
from io import BytesIO
import xlsxwriter
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph
from reportlab.lib.styles import getSampleStyleSheet
from datetime import datetime, time
from django.db import models
from django.utils import timezone
from usuario.models import Usuario
from reportlab.lib.units import mm
from django.urls import reverse
from django.utils.dateparse import parse_date
from django.contrib.auth.decorators import user_passes_test

# --- Utilidades de carrito en sesión ---
def get_cart(request):
    carrito = request.session.get('carrito_venta', [])
    if 'carrito_venta' not in request.session:
        request.session['carrito_venta'] = []
        request.session.modified = True
        carrito = []
    return carrito

def save_cart(request, cart):
    request.session['carrito_venta'] = cart
    request.session.modified = True

def clear_cart(request):
    if 'carrito_venta' in request.session:
        del request.session['carrito_venta']
    if 'bodega_salida_venta' in request.session:
        del request.session['bodega_salida_venta']
    if 'tienda_llegada_venta' in request.session:
        del request.session['tienda_llegada_venta']
    request.session.modified = True

def get_producto_or_none(producto_id):
    try:
        return Producto.objects.get(id_producto=producto_id)
    except Producto.DoesNotExist:
        return None

# --- Vistas de Carrito ---
def ventas(request):
    mostrar = int(request.GET.get('mostrar', 5))
    orden = request.GET.get('orden', 'desc')
    fecha_inicio = request.GET.get('fecha_inicio')
    fecha_fin = request.GET.get('fecha_fin')
    search_query = request.GET.get('search', '').strip()
    filter_estados = request.GET.getlist('filter_estado')

    ventas_qs = Venta.objects.filter(eliminado=False)
    if fecha_inicio:
        fecha_inicio_parsed = parse_date(fecha_inicio)
        if fecha_inicio_parsed:
            # Incluir desde el inicio del día
            fecha_inicio_datetime = timezone.make_aware(datetime.combine(fecha_inicio_parsed, time.min))
            ventas_qs = ventas_qs.filter(fecha__gte=fecha_inicio_datetime)
    if fecha_fin:
        fecha_fin_parsed = parse_date(fecha_fin)
        if fecha_fin_parsed:
            # Incluir hasta el final del día
            fecha_fin_datetime = timezone.make_aware(datetime.combine(fecha_fin_parsed, time.max))
            ventas_qs = ventas_qs.filter(fecha__lte=fecha_fin_datetime)
    if filter_estados:
        ventas_qs = ventas_qs.filter(estado__in=filter_estados)
    if search_query:
        # Buscar por nombre de producto en los detalles de venta
        ventas_qs = ventas_qs.filter(
            Q(detalles__producto__nombre__icontains=search_query)
        ).distinct()

    if orden == 'asc':
        lista_ventas = ventas_qs.order_by('fecha', 'id_venta')
    else:
        lista_ventas = ventas_qs.order_by('-fecha', '-id_venta')
    nombre_usuario = request.session.get('usuario_nombre', 'Invitado')

    # Inicializar carrito explícitamente
    if 'carrito_venta' not in request.session:
        request.session['carrito_venta'] = []
        request.session.modified = True

    # Carrito actual en sesión
    carrito = get_cart(request)
    if carrito is None or not isinstance(carrito, list):
        carrito = []
        save_cart(request, carrito)

    productos_carrito = []
    total_carrito = Decimal('0.00')
    for item in carrito:
        try:
            producto = Producto.objects.get(id_producto=item['producto_id'])
            precio = item.get('precio', producto.precio_unitario)
            subtotal = Decimal(str(precio)) * item['cantidad']
            productos_carrito.append({
                'producto': producto,
                'cantidad': item['cantidad'],
                'precio': float(precio),
                'subtotal': float(subtotal)
            })
            total_carrito += subtotal
        except Producto.DoesNotExist:
            continue

    productos = Producto.objects.all()
    categorias = Categoria.objects.all()

    # Obtener sucursales seleccionadas si existen en la sesión Y el carrito no está vacío
    bodega_salida_seleccionada = None
    tienda_llegada_seleccionada = None
    bodega_salida_id_sesion = request.session.get('bodega_salida_venta')
    tienda_llegada_id_sesion = request.session.get('tienda_llegada_venta')
    if bodega_salida_id_sesion and tienda_llegada_id_sesion and len(carrito) > 0:
        try:
            bodega_salida_seleccionada = Sucursal.objects.get(id_sucursal=bodega_salida_id_sesion, tipo='BODEGA')
        except Sucursal.DoesNotExist:
            bodega_salida_seleccionada = None
        try:
            tienda_llegada_seleccionada = Sucursal.objects.get(id_sucursal=tienda_llegada_id_sesion, tipo='TIENDA')
        except Sucursal.DoesNotExist:
            tienda_llegada_seleccionada = None
    elif len(carrito) == 0:
        # Si el carrito está vacío, limpiar las sucursales de la sesión
        if 'bodega_salida_venta' in request.session:
            del request.session['bodega_salida_venta']
        if 'tienda_llegada_venta' in request.session:
            del request.session['tienda_llegada_venta']
        request.session.modified = True

    ventas_con_detalles = []
    for venta in lista_ventas:
        detalles = []
        total_venta = Decimal('0.00')
        
        # Mostrar todos los detalles con la cantidad actual (igual que en editar_venta)
        # Incluir detalles incluso si cantidad es 0 (para ventas completamente reembolsadas)
        for d in venta.detalles.select_related('producto').all():
            # Mostrar la cantidad actual del detalle directamente (puede ser 0 si está completamente reembolsado)
            cantidad_mostrar = d.cantidad
            
            # Mostrar siempre el detalle, incluso si cantidad_mostrar es 0
            subtotal = cantidad_mostrar * d.precio_unitario
            detalles.append({
                'producto': d.producto,
                'cantidad': cantidad_mostrar,
                'precio_unitario': float(d.precio_unitario),
                'subtotal': float(subtotal),
            })
            total_venta += subtotal
        ventas_con_detalles.append({
            'venta': venta,
            'detalles': detalles,
            'total_venta': float(total_venta),
        })

    page_number = request.GET.get('page', 1)
    paginator = Paginator(ventas_con_detalles, mostrar)
    page_obj = paginator.get_page(page_number)

    # Calcular total de ventas filtradas
    total_ventas = ventas_qs.aggregate(total=models.Sum('total_venta'))['total'] or 0

    context = {
        'ventas': lista_ventas,
        'ventas_con_detalles': page_obj.object_list,
        'page_obj': page_obj,
        'paginator': paginator,
        'nombre_usuario': nombre_usuario,
        'carrito': productos_carrito,
        'total_carrito': float(total_carrito),
        'productos': productos,
        'categorias': categorias,
        'mostrar': mostrar,
        'orden': orden,
        'filter_estados': filter_estados,
        'total_ventas': total_ventas,
        'bodega_salida_seleccionada': bodega_salida_seleccionada,
        'tienda_llegada_seleccionada': tienda_llegada_seleccionada,
    }
    
    # Si es una petición AJAX, devolver solo el contenido de la tabla
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return render(request, 'venta/partials/table_content.html', context)
    
    return render(request, 'venta/ventas.html', context)

@require_POST
def agregar_a_carrito(request):
    if request.method == 'POST':
        producto_id = request.POST.get('producto_id')
        if not producto_id or not producto_id.isdigit():
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': False,
                    'message': 'Debes seleccionar un producto válido.'
                })
            else:
                messages.error(request, 'Debes seleccionar un producto válido.')
                return redirect('ventas')
        try:
            cantidad = int(request.POST.get('cantidad', 1))
        except (TypeError, ValueError):
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': False,
                    'message': 'Cantidad inválida.'
                })
            else:
                messages.error(request, 'Cantidad inválida.')
                return redirect('ventas')
        if cantidad <= 0:
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': False,
                    'message': 'La cantidad debe ser mayor a cero.'
                })
            else:
                messages.error(request, 'La cantidad debe ser mayor a cero.')
                return redirect('ventas')
        producto = get_producto_or_none(producto_id)
        if not producto:
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': False,
                    'message': 'Producto no encontrado.'
                })
            else:
                messages.error(request, 'Producto no encontrado.')
                return redirect('ventas')
        if producto.stock_actual < cantidad:
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': False,
                    'message': 'Stock insuficiente para el producto.'
                })
            else:
                messages.error(request, 'Stock insuficiente para el producto.')
                return redirect('ventas')
        # Obtener bodega de salida y tienda de llegada
        bodega_salida_id = request.POST.get('bodega_salida_id')
        tienda_llegada_id = request.POST.get('tienda_llegada_id')
        
        # Si es el primer producto en el carrito, guardar las sucursales en la sesión
        carrito = get_cart(request)
        if len(carrito) == 0:
            if bodega_salida_id and bodega_salida_id.isdigit():
                request.session['bodega_salida_venta'] = int(bodega_salida_id)
            if tienda_llegada_id and tienda_llegada_id.isdigit():
                request.session['tienda_llegada_venta'] = int(tienda_llegada_id)
            request.session.modified = True
        
        # Buscar si el producto ya está en el carrito
        producto_en_carrito = False
        for item in carrito:
            if item['producto_id'] == producto.id_producto:
                # Si ya existe, reemplazar la cantidad (no sumar)
                item['cantidad'] = cantidad
                producto_en_carrito = True
                break
        # Si no existe, agregarlo
        if not producto_en_carrito:
            carrito.append({
                'producto_id': producto.id_producto, 
                'cantidad': cantidad,
                'precio': float(producto.precio_unitario)
            })
        save_cart(request, carrito)
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({
                'success': True,
                'message': f'{producto.nombre} agregado al carrito.'
            })
        else:
            messages.success(request, f'{producto.nombre} agregado al carrito.')
            return redirect('ventas')
    return redirect('ventas')

@require_POST
def editar_carrito_precio(request, producto_id):
    if request.method == 'POST':
        try:
            nuevo_precio = float(request.POST.get('precio', 0))
            print(f"DEBUG - Editando precio carrito venta: producto_id={producto_id}, nuevo_precio={nuevo_precio}")
        except (TypeError, ValueError):
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': False,
                    'message': 'Precio inválido.'
                })
            messages.error(request, 'Precio inválido.')
            return redirect('ventas')
        if nuevo_precio < 0:
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': False,
                    'message': 'El precio debe ser mayor o igual a cero.'
                })
            messages.error(request, 'El precio debe ser mayor o igual a cero.')
            return redirect('ventas')
        producto = get_producto_or_none(producto_id)
        if not producto:
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': False,
                    'message': 'Producto no encontrado.'
                })
            messages.error(request, 'Producto no encontrado.')
            return redirect('ventas')
        
        carrito = get_cart(request)
        print(f"DEBUG - Carrito antes de editar precio: {carrito}")
        for item in carrito:
            if str(item['producto_id']) == str(producto_id):
                item['precio'] = nuevo_precio
                print(f"DEBUG - Precio actualizado para producto {producto_id}: {nuevo_precio}")
                break
        save_cart(request, carrito)
        print(f"DEBUG - Carrito después de editar precio: {get_cart(request)}")
        
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({
                'success': True,
                'message': 'Precio editado correctamente en el carrito.'
            })
        else:
            messages.success(request, 'Precio editado correctamente en el carrito.')
            return redirect('ventas')
    return redirect('ventas')

@require_POST
def eliminar_de_carrito(request, producto_id):
    carrito = get_cart(request)
    carrito = [item for item in carrito if str(item['producto_id']) != str(producto_id)]
    save_cart(request, carrito)
    
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return JsonResponse({'success': True, 'message': 'Producto eliminado del carrito.'})
    messages.success(request, 'Producto eliminado del carrito.')
    return redirect('ventas')

@require_POST
def editar_carrito(request, producto_id):
    if request.method == 'POST':
        try:
            nueva_cantidad = int(request.POST.get('cantidad', 1))
            print(f"DEBUG - Editando carrito venta: producto_id={producto_id}, nueva_cantidad={nueva_cantidad}")
        except (TypeError, ValueError):
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': False,
                    'message': 'Cantidad inválida.'
                })
            messages.error(request, 'Cantidad inválida.')
            return redirect('ventas')
        if nueva_cantidad <= 0:
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': False,
                    'message': 'La cantidad debe ser mayor a cero.'
                })
            messages.error(request, 'La cantidad debe ser mayor a cero.')
            return redirect('ventas')
        producto = get_producto_or_none(producto_id)
        if not producto:
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': False,
                    'message': 'Producto no encontrado.'
                })
            messages.error(request, 'Producto no encontrado.')
            return redirect('ventas')
        
        # Validación de stock para ventas
        if producto.stock_actual < nueva_cantidad:
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': False,
                    'message': f'Stock insuficiente para {producto.nombre}. Stock disponible: {producto.stock_actual}'
                })
            messages.error(request, f'Stock insuficiente para {producto.nombre}. Stock disponible: {producto.stock_actual}')
            return redirect('ventas')
        
        carrito = get_cart(request)
        print(f"DEBUG - Carrito antes de editar: {carrito}")
        for item in carrito:
            if str(item['producto_id']) == str(producto_id):
                item['cantidad'] = nueva_cantidad
                # Mantener el precio si existe, sino usar el precio del producto
                if 'precio' not in item:
                    producto = get_producto_or_none(producto_id)
                    if producto:
                        item['precio'] = float(producto.precio_unitario)
                print(f"DEBUG - Cantidad actualizada para producto {producto_id}: {nueva_cantidad}")
                break
        save_cart(request, carrito)
        print(f"DEBUG - Carrito después de editar: {get_cart(request)}")
        
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({
                'success': True,
                'message': 'Cantidad editada correctamente en el carrito.'
            })
        else:
            messages.success(request, 'Cantidad editada correctamente en el carrito.')
            return redirect('ventas')
    return redirect('ventas')

@require_POST
def finalizar_venta(request):
    carrito = get_cart(request)
    print(f"DEBUG - Carrito al finalizar venta: {carrito}")
    
    if not carrito:
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({
                'success': False,
                'message': 'El carrito está vacío.'
            })
        messages.error(request, 'El carrito está vacío.')
        return redirect('ventas')
    try:
        with transaction.atomic():
            usuario_id = request.session.get('usuario_id')
            usuario = None
            if usuario_id:
                from usuario.models import Usuario
                try:
                    usuario = Usuario.objects.get(id_usuario=usuario_id)
                except Usuario.DoesNotExist:
                    pass
            # Obtener bodega de salida y tienda de llegada de la sesión
            bodega_salida_id = request.session.get('bodega_salida_venta')
            tienda_llegada_id = request.session.get('tienda_llegada_venta')
            bodega_salida = None
            tienda_llegada = None
            if bodega_salida_id:
                try:
                    bodega_salida = Sucursal.objects.get(id_sucursal=bodega_salida_id, tipo='BODEGA')
                except Sucursal.DoesNotExist:
                    pass
            if tienda_llegada_id:
                try:
                    tienda_llegada = Sucursal.objects.get(id_sucursal=tienda_llegada_id, tipo='TIENDA')
                except Sucursal.DoesNotExist:
                    pass
            
            venta = Venta.objects.create(
                usuario=usuario,
                observaciones=request.POST.get('observaciones', ''),
                bodega_salida=bodega_salida,
                tienda_llegada=tienda_llegada
            )
            total_venta = Decimal('0.00')
            for item in carrito:
                print(f"DEBUG - Procesando item del carrito: {item}")
                producto = Producto.objects.get(id_producto=item['producto_id'])
                precio = Decimal(str(item.get('precio', producto.precio_unitario)))
                print(f"DEBUG - Creando detalle: {producto.nombre}, cantidad: {item['cantidad']}, precio: {precio}")
                detalle = DetalleVenta.objects.create(
                    venta=venta,
                    producto=producto,
                    cantidad=item['cantidad'],
                    precio_unitario=precio,
                    subtotal=precio * item['cantidad'],
                    estado='ACTIVO'
                )
                total_venta += detalle.subtotal
                # NO restar stock aquí - se restará cuando se confirme el envío
            venta.total_venta = total_venta
            venta.asignar_numero_venta()
            venta.save()
            clear_cart(request)
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': True,
                    'message': f'Salida #{venta.id_venta} creada exitosamente.'
                })
            messages.success(request, f'Salida #{venta.id_venta} creada exitosamente.')
            return redirect('ventas')
    except Exception as e:
        print(f"DEBUG - Error en finalizar_venta: {str(e)}")
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({
                'success': False,
                'message': f'Error al crear la venta: {str(e)}'
            })
        messages.error(request, f'Error al crear la salida: {str(e)}')
        return redirect('ventas')

def agregar_venta(request):
    if request.method == 'POST':
        form = VentaForm(request.POST)
        if form.is_valid():
            producto = form.cleaned_data['producto']
            cantidad = form.cleaned_data['cantidad']
            observaciones = form.cleaned_data.get('observaciones', '')

            if producto.stock_actual < cantidad:
                return redirect('ventas')

            Venta.objects.create(
                id_producto=producto,
                cantidad=cantidad,
                observaciones=observaciones,
            )
            producto.stock_actual -= cantidad
            producto.save()

            request.session['detalle_venta'] = {'producto_id': producto.id_producto, 'cantidad': cantidad}
            messages.success(request, "Salida agregada correctamente.")
        else:
            return redirect('ventas')

    return redirect('ventas')

def eliminar_venta(request, id):
    if request.method == 'POST':
        try:
            venta = get_object_or_404(Venta, id_venta=id)
            with transaction.atomic():
                # Devolver el stock solo si la venta estaba ENVIADA (el stock fue restado)
                if venta.estado == 'ENVIADO':
                    for detalle in venta.detalles.all():
                        producto = detalle.producto
                        producto.stock_actual += detalle.cantidad
                        producto.save()

                # Eliminar reembolsos asociados primero
                venta.reembolsos.all().delete()

                # NO eliminar los detalles de la venta físicamente
                # Los detalles se mantienen para poder restaurar la venta
                # Solo marcar la venta como eliminada

                # Usar soft delete en lugar de eliminación física
                venta.soft_delete()

                # Nota: No reorganizar números automáticamente para evitar conflictos
                # Los números se asignarán correctamente en la siguiente venta

            return JsonResponse({
                'success': True,
                'message': 'Salida eliminada correctamente.',
                'venta_id': id
            })
        except Exception as e:
            return JsonResponse({
                'success': False,
                'message': f'Error al eliminar la venta: {str(e)}'
            })
    return JsonResponse({
        'success': False,
        'message': 'Método no permitido.'
    })

def restaurar_venta(request, id):
    if request.method == 'POST':
        try:
            venta = get_object_or_404(Venta.all_objects, id_venta=id)
            with transaction.atomic():
                # Restaurar la venta
                venta.restore()

                # Restar el stock solo si la venta estaba ENVIADA (el stock fue restado antes de eliminar)
                if venta.estado == 'ENVIADO':
                    for detalle in venta.detalles.all():
                        producto = detalle.producto
                        # Verificar stock disponible
                        if producto.stock_actual < detalle.cantidad:
                            return JsonResponse({
                                'success': False,
                                'message': f'Stock insuficiente para {producto.nombre}. Stock disponible: {producto.stock_actual}, necesario: {detalle.cantidad}'
                            })
                        producto.stock_actual -= detalle.cantidad
                        producto.save()

            return JsonResponse({
                'success': True,
                'message': 'Salida restaurada correctamente.'
            })
        except Exception as e:
            return JsonResponse({
                'success': False,
                'message': f'Error al restaurar la venta: {str(e)}'
            })
    return JsonResponse({
        'success': False,
        'message': 'Método no permitido.'
    })

def validar_producto(request):
    nombre_o_codigo = request.GET.get('producto', '').strip()
    producto = Producto.objects.filter(nombre__iexact=nombre_o_codigo).first()
    if not producto:
        codigo_obj = Codigo.objects.filter(codigo__iexact=nombre_o_codigo).first()
        if codigo_obj:
            producto = Producto.objects.filter(id_producto=codigo_obj.id_producto.id_producto).first()
    if producto:
        return JsonResponse({
            'existe': True,
            'stock': producto.stock_actual,
            'stock_minimo': producto.stock_minimo if producto.stock_minimo is not None else None
        })
    return JsonResponse({'existe': False})

@require_GET
def validar_codigo(request):
    codigo = request.GET.get('codigo', '').strip()
    if codigo:
        try:
            producto = Producto.objects.get(codigo__codigo=codigo)
            return JsonResponse({
                'existe': True,
                'nombre': producto.nombre,
                'precio': float(producto.precio_unitario)
            })
        except Producto.DoesNotExist:
            return JsonResponse({'existe': False})
    return JsonResponse({'existe': False})

def editar_venta(request, id):
    venta = get_object_or_404(Venta, id_venta=id)

    # Actualizar el estado de la venta antes de mostrar la página
    venta.actualizar_estado()
    venta.refresh_from_db()

    # Obtener detalles y actualizar sus estados
    detalles = venta.detalles.select_related('producto').all()
    for detalle in detalles:
        detalle.actualizar_estado()
        detalle.refresh_from_db()

    if request.method == 'POST':
        with transaction.atomic():
            total_reembolso = Decimal('0.00')
            venta_modificada = False
            reembolso_items = []
            cambios_detallados = []

            for detalle in detalles:
                nueva_cantidad_str = request.POST.get(f'cantidad_{detalle.id_detalle}', '0')
                nueva_cantidad = int(nueva_cantidad_str) if nueva_cantidad_str.isdigit() else 0
                cantidad_original = detalle.cantidad

                if nueva_cantidad < 0:
                    messages.error(request, 'La cantidad no puede ser negativa.')
                    return redirect('ventas')

                # Comparación más robusta
                if nueva_cantidad != cantidad_original:
                    venta_modificada = True
                    cantidad_reembolso = cantidad_original - nueva_cantidad

                    if cantidad_reembolso > 0:  # Hay reembolso
                        # Actualizar stock solo si la venta está ENVIADA
                        if venta.estado == 'ENVIADO':
                            detalle.producto.stock_actual += cantidad_reembolso
                            detalle.producto.save()
                        # Calcular monto reembolsado
                        monto_reembolso = cantidad_reembolso * detalle.precio_unitario
                        total_reembolso += monto_reembolso
                        # Guardar para crear el registro de reembolso
                        reembolso_items.append({
                            'producto': detalle.producto,
                            'cantidad': cantidad_reembolso,
                            'monto': monto_reembolso
                        })
                        # Actualizar detalle
                        detalle.cantidad = nueva_cantidad
                        detalle.subtotal = nueva_cantidad * detalle.precio_unitario
                        detalle.estado = 'Parcialmente Reembolsado' if nueva_cantidad > 0 else 'Reembolsado'
                        detalle.save()

                        cambios_detallados.append(f"Reembolso de {cantidad_reembolso} unidades de {detalle.producto.nombre}")

                    elif nueva_cantidad > cantidad_original:  # Aumentar cantidad
                        diferencia_agregar = nueva_cantidad - cantidad_original
                        # Actualizar stock solo si la venta está ENVIADA
                        if venta.estado == 'ENVIADO':
                            if detalle.producto.stock_actual < diferencia_agregar:
                                messages.error(request, f'Stock insuficiente para {detalle.producto.nombre}. Stock disponible: {detalle.producto.stock_actual}, necesitas: {diferencia_agregar}')
                                return redirect('ventas')
                            detalle.producto.stock_actual -= diferencia_agregar
                            detalle.producto.save()
                        # Actualizar detalle
                        detalle.cantidad = nueva_cantidad
                        detalle.subtotal = nueva_cantidad * detalle.precio_unitario
                        detalle.estado = 'ACTIVO'
                        detalle.save()

                        cambios_detallados.append(f"Agregadas {diferencia_agregar} unidades de {detalle.producto.nombre}")

            if venta_modificada:
                # Crear registro de reembolso si corresponde
                if reembolso_items:
                    usuario_id = request.session.get('usuario_id')
                    if usuario_id:
                        try:
                            usuario = Usuario.objects.get(id_usuario=usuario_id)
                        except Usuario.DoesNotExist:
                            usuario = None
                    else:
                        usuario = None

                    reembolso = Reembolso.objects.create(
                        venta=venta,
                        usuario=usuario,
                        observaciones=request.POST.get('observaciones', ''),
                        total_devuelto=total_reembolso
                    )

                    # Asignar automáticamente el número de reembolso
                    reembolso.asignar_numero_reembolso()

                    for item in reembolso_items:
                        ReembolsoDetalle.objects.create(
                            reembolso=reembolso,
                            producto=item['producto'],
                            cantidad=item['cantidad'],
                            monto=item['monto']
                        )
                        # Debug: verificar que se creó correctamente
                        # print(f"ReembolsoDetalle creado: venta={reembolso.venta.id_venta}, producto={item['producto'].id_producto}, cantidad={item['cantidad']}")

                # Actualizar observaciones de la venta
                venta.observaciones = request.POST.get('observaciones', '')

                # Actualizar total de la venta
                venta.actualizar_total()

                # Actualizar estado de la venta usando el método del modelo
                venta.actualizar_estado()

                # Guardar la venta
                venta.save()

                # Mensaje de éxito más detallado
                if total_reembolso > 0:
                    mensaje = f'Venta editada correctamente. Reembolso total: ${total_reembolso:.2f}'
                    if cambios_detallados:
                        mensaje += f' ({", ".join(cambios_detallados)})'
                    messages.success(request, mensaje)
                else:
                    mensaje = 'Venta editada correctamente.'
                    if cambios_detallados:
                        mensaje += f' ({", ".join(cambios_detallados)})'
                    messages.success(request, mensaje)
            else:
                # Aunque no haya cambios en cantidades, guardar las observaciones si se modificaron
                observaciones_actuales = venta.observaciones or ''
                observaciones_nuevas = request.POST.get('observaciones', '')

                if observaciones_actuales != observaciones_nuevas:
                    venta.observaciones = observaciones_nuevas
                    venta.save()
                    messages.success(request, 'Observaciones actualizadas correctamente.')
                else:
                    messages.info(request, 'No se realizaron cambios en la salida.')
            return redirect(reverse('ventas') + '?actualizado=1')
    return render(request, 'venta/editar_venta.html', {
        'venta': venta,
        'detalles': detalles,
    })

@csrf_exempt
@require_POST
def editar_venta_ajax(request, id):
    import json
    venta = get_object_or_404(Venta, id_venta=id)
    try:
        data = json.loads(request.body)
        cantidades = data.get('cantidades', [])
        observaciones = data.get('observaciones', '')
        fecha = data.get('fecha', None)
        detalles = list(venta.detalles.select_related('producto').all())
        if len(cantidades) != len(detalles):
            return JsonResponse({'success': False, 'error': 'Cantidad de productos no coincide.'})
        # Solo validar y actualizar stock si la venta está ENVIADA
        if venta.estado == 'ENVIADO':
            # Validar stock
            for idx, detalle in enumerate(detalles):
                nueva_cantidad = int(cantidades[idx])
                producto = detalle.producto
                stock_disponible = producto.stock_actual + detalle.cantidad
                if nueva_cantidad > stock_disponible:
                    return JsonResponse({'success': False, 'error': f'Stock insuficiente para {producto.nombre}.'})
            # Actualizar detalles y stock
            for idx, detalle in enumerate(detalles):
                nueva_cantidad = int(cantidades[idx])
                producto = detalle.producto
                producto.stock_actual += detalle.cantidad  # devolver stock anterior
                producto.stock_actual -= nueva_cantidad    # restar nuevo
                producto.save()
                detalle.cantidad = nueva_cantidad
                detalle.save()
        else:
            # Si no está ENVIADA, solo actualizar las cantidades sin tocar el stock
            for idx, detalle in enumerate(detalles):
                nueva_cantidad = int(cantidades[idx])
                detalle.cantidad = nueva_cantidad
                detalle.save()
        venta.observaciones = observaciones
        if fecha:
            venta.fecha = fecha
        venta.save()
        return JsonResponse({'success': True})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})

@require_GET
def autocomplete_productos(request):
    query = request.GET.get('q', '').strip()
    categoria_id = request.GET.get('categoria')

    # Optimizar consultas con select_related y prefetch_related
    productos = Producto.objects.select_related('id_categoria').prefetch_related('codigo_set')

    # Si no hay query, devolver todos los productos
    if not query:
        if categoria_id:
            productos = productos.filter(id_categoria_id=categoria_id)
        productos = productos.order_by('nombre')[:5]

        results = []
        for p in productos:
            codigo = p.codigo_set.first()
            results.append({
                'id': p.id_producto,
                'nombre': p.nombre,
                'codigo': codigo.codigo if codigo else '',
                'precio_venta': float(p.precio_unitario),
                'stock': p.stock_actual,
                'categoria': p.id_categoria.nombre if p.id_categoria else None
            })
        return JsonResponse({'results': results})

@require_POST
def confirmar_entrega(request, id):
    try:
        venta = Venta.objects.get(id_venta=id)
        venta.fecha_entrega = timezone.now()
        
        # Guardar el usuario que confirmó la entrega
        usuario_id = request.session.get('usuario_id')
        if usuario_id:
            try:
                usuario_confirmo = Usuario.objects.get(id_usuario=usuario_id)
                venta.usuario_confirmo_entrega = usuario_confirmo
            except Usuario.DoesNotExist:
                pass
        
        # Guardar las observaciones de entrega si se proporcionan
        observaciones_entrega = request.POST.get('observaciones', '').strip()
        if observaciones_entrega:
            # Obtener la fecha/hora local
            fecha_local = timezone.localtime(timezone.now())
            fecha_formateada = fecha_local.strftime('%d/%m/%Y %H:%M')
            # Si ya hay observaciones, agregar las nuevas al final
            if venta.observaciones:
                venta.observaciones += f"\n--- Observaciones de envío ({fecha_formateada}): {observaciones_entrega}"
            else:
                venta.observaciones = f"Observaciones de envío ({fecha_formateada}): {observaciones_entrega}"
        
        venta.save()
        # Actualizar el estado basado en fecha_entrega
        venta.actualizar_estado()
        
        # Restar stock cuando se confirma el envío
        if venta.estado == 'ENVIADO':
            for detalle in venta.detalles.all():
                producto = detalle.producto
                # Verificar que hay stock suficiente
                if producto.stock_actual < detalle.cantidad:
                    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                        return JsonResponse({
                            'success': False,
                            'message': f'Stock insuficiente para {producto.nombre}. Stock disponible: {producto.stock_actual}, necesario: {detalle.cantidad}'
                        })
                    messages.error(request, f'Stock insuficiente para {producto.nombre}. Stock disponible: {producto.stock_actual}, necesario: {detalle.cantidad}')
                    return redirect('ventas')
                producto.stock_actual -= detalle.cantidad
                producto.save()
        
        numero_salida = venta.numero_venta if venta.numero_venta else venta.id_venta
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({
                'success': True,
                'message': f'Envío de salida #{numero_salida} confirmado.',
                'venta_id': venta.id_venta
            })
        messages.success(request, f'Envío de salida #{numero_salida} confirmado.')
        return redirect('ventas')
    except Venta.DoesNotExist:
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({
                'success': False,
                'message': 'Venta no encontrada.'
            })
        messages.error(request, 'Salida no encontrada.')
        return redirect('ventas')

@require_GET
def autocomplete_sucursales(request):
    query = request.GET.get('q', '').strip()
    tipo = request.GET.get('tipo', '').strip()  # 'BODEGA' o 'TIENDA'
    
    # Filtrar por tipo si se especifica
    if tipo:
        sucursales = Sucursal.objects.filter(tipo=tipo)
    else:
        sucursales = Sucursal.objects.all()
    
    # Si no hay query, mostrar todas las sucursales del tipo
    if not query:
        sucursales_filtradas = list(sucursales)
    else:
        # Filtrar por nombre
        sucursales_filtradas = list(sucursales.filter(
            nombre__icontains=query
        ))
    
    # Ordenar por nombre y limitar a 10
    sucursales_filtradas = sorted(sucursales_filtradas, key=lambda x: x.nombre)[:10]
    
    results = []
    for s in sucursales_filtradas:
        results.append({
            'id': s.id_sucursal,
            'nombre': s.nombre,
            'tipo': s.tipo,
            'direccion': s.direccion or '',
            'ciudad': s.ciudad or ''
        })
    
    return JsonResponse({'results': results})

def listar_reembolsos(request):
    mostrar = int(request.GET.get('mostrar', 10))
    fecha_inicio = request.GET.get('fecha_inicio')
    fecha_fin = request.GET.get('fecha_fin')
    venta_numero = request.GET.get('venta')
    search_query = request.GET.get('search', '').strip()
    filter_estados = request.GET.getlist('filter_estado')

    reembolsos_qs = Reembolso.objects.select_related('venta', 'usuario').prefetch_related('detalles__producto').order_by('-fecha_hora')
    
    # Filtros opcionales
    if fecha_inicio:
        fecha_inicio_parsed = parse_date(fecha_inicio)
        if fecha_inicio_parsed:
            # Incluir desde el inicio del día
            fecha_inicio_datetime = timezone.make_aware(datetime.combine(fecha_inicio_parsed, time.min))
            reembolsos_qs = reembolsos_qs.filter(fecha_hora__gte=fecha_inicio_datetime)
    if fecha_fin:
        fecha_fin_parsed = parse_date(fecha_fin)
        if fecha_fin_parsed:
            # Incluir hasta el final del día
            fecha_fin_datetime = timezone.make_aware(datetime.combine(fecha_fin_parsed, time.max))
            reembolsos_qs = reembolsos_qs.filter(fecha_hora__lte=fecha_fin_datetime)
    if venta_numero and venta_numero not in ('', None, 'None'):
        try:
            venta_numero_int = int(venta_numero)
            reembolsos_qs = reembolsos_qs.filter(venta__numero_venta=venta_numero_int)
        except ValueError:
            pass
    if filter_estados:
        reembolsos_qs = reembolsos_qs.filter(venta__estado__in=filter_estados)
    if search_query:
        # Buscar por número de venta
        try:
            # Intentar buscar como número
            numero_venta = int(search_query)
            reembolsos_qs = reembolsos_qs.filter(
                Q(venta__numero_venta=numero_venta) | Q(venta__id_venta=numero_venta)
            )
        except ValueError:
            # Si no es un número, buscar como string en número de venta
            reembolsos_qs = reembolsos_qs.filter(
                Q(venta__numero_venta__icontains=search_query)
            )

    # Paginación
    page_number = request.GET.get('page', 1)
    paginator = Paginator(reembolsos_qs, mostrar)
    page_obj = paginator.get_page(page_number)

    total_reembolsado = reembolsos_qs.aggregate(total=models.Sum('total_devuelto'))['total'] or 0

    context = {
        'reembolsos': page_obj.object_list,
        'page_obj': page_obj,
        'paginator': paginator,
        'total_reembolsado': total_reembolsado,
        'mostrar': mostrar,
        'filter_estados': filter_estados,
        'filtros': {
            'fecha_inicio': fecha_inicio,
            'fecha_fin': fecha_fin,
            'venta_id': venta_numero,
        }
    }
    
    # Si es una petición AJAX, devolver solo el contenido de la tabla
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return render(request, 'venta/partials/table_content_reembolsos.html', context)
    
    return render(request, 'venta/lista_reembolsos.html', context)

def exportar_reembolsos_excel(request):
    # Obtener los mismos filtros que en listar_reembolsos
    reembolsos = Reembolso.objects.select_related('venta', 'usuario').prefetch_related('detalles__producto').order_by('-fecha_hora')
    fecha_inicio = request.GET.get('fecha_inicio')
    fecha_fin = request.GET.get('fecha_fin')
    venta_numero = request.GET.get('venta')

    if fecha_inicio:
        reembolsos = reembolsos.filter(fecha_hora__date__gte=fecha_inicio)
    if fecha_fin:
        reembolsos = reembolsos.filter(fecha_hora__date__lte=fecha_fin)
    if venta_numero and venta_numero not in ('', None, 'None'):
        try:
            venta_numero_int = int(venta_numero)
            reembolsos = reembolsos.filter(venta__numero_venta=venta_numero_int)
        except ValueError:
            pass

    # Crear el archivo Excel
    output = BytesIO()
    workbook = xlsxwriter.Workbook(output)
    worksheet = workbook.add_worksheet()

    # Formatos
    header_format = workbook.add_format({
        'bold': True,
        'bg_color': '#D9E1F2',
        'border': 1
    })
    money_format = workbook.add_format({
        'num_format': '$#,##0',
        'border': 1
    })
    date_format = workbook.add_format({
        'num_format': 'yyyy-mm-dd hh:mm',
        'border': 1
    })
    border_format = workbook.add_format({'border': 1})

    # Escribir encabezados
    headers = ['Fecha', 'ID Venta', 'ID Reembolso', 'Productos', 'Cantidad', 'Total Devuelto', 'Usuario', 'Observaciones']
    for col, header in enumerate(headers):
        worksheet.write(0, col, header, header_format)

    # Escribir datos
    row = 1
    for reembolso in reembolsos:
        for detalle in reembolso.detalles.all():
            worksheet.write(row, 0, reembolso.fecha_hora, date_format)
            numero_venta = reembolso.venta.numero_venta if reembolso.venta.numero_venta else reembolso.venta.id_venta
            numero_reembolso = reembolso.numero_reembolso if reembolso.numero_reembolso else reembolso.id_reembolso
            worksheet.write(row, 1, numero_venta, border_format)
            worksheet.write(row, 2, numero_reembolso, border_format)
            worksheet.write(row, 3, detalle.producto.nombre, border_format)
            worksheet.write(row, 4, detalle.cantidad, border_format)
            worksheet.write(row, 5, float(detalle.monto), money_format)
            worksheet.write(row, 6, reembolso.usuario.nombre_usuario if reembolso.usuario else '', border_format)
            worksheet.write(row, 7, reembolso.observaciones or '', border_format)
            row += 1

    # Ajustar ancho de columnas
    worksheet.set_column('A:A', 20)
    worksheet.set_column('B:B', 10)
    worksheet.set_column('C:C', 12)
    worksheet.set_column('D:D', 30)
    worksheet.set_column('E:E', 10)
    worksheet.set_column('F:F', 15)
    worksheet.set_column('G:G', 15)
    worksheet.set_column('H:H', 40)

    # Escribir total
    total = reembolsos.aggregate(total=models.Sum('total_devuelto'))['total'] or 0
    worksheet.write(row, 4, 'Total:', header_format)
    worksheet.write(row, 5, float(total), money_format)

    workbook.close()
    output.seek(0)

    # Preparar la respuesta
    response = HttpResponse(
        output.read(),
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    response['Content-Disposition'] = f'attachment; filename=reembolsos_{datetime.now().strftime("%Y%m%d_%H%M")}.xlsx'
    return response

def exportar_reembolsos_pdf(request):
    # Obtener los mismos filtros que en listar_reembolsos
    reembolsos = Reembolso.objects.select_related('venta', 'usuario').prefetch_related('detalles__producto').order_by('-fecha_hora')
    fecha_inicio = request.GET.get('fecha_inicio')
    fecha_fin = request.GET.get('fecha_fin')
    venta_numero = request.GET.get('venta')

    if fecha_inicio:
        reembolsos = reembolsos.filter(fecha_hora__date__gte=fecha_inicio)
    if fecha_fin:
        reembolsos = reembolsos.filter(fecha_hora__date__lte=fecha_fin)
    if venta_numero and venta_numero not in ('', None, 'None'):
        try:
            venta_numero_int = int(venta_numero)
            reembolsos = reembolsos.filter(venta__numero_venta=venta_numero_int)
        except ValueError:
            pass

    # Crear el PDF
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    elements = []
    styles = getSampleStyleSheet()

    # Título
    elements.append(Paragraph("Reporte de Reembolsos", styles['Title']))
    elements.append(Paragraph(f"Generado el {datetime.now().strftime('%Y-%m-%d %H:%M')}", styles['Normal']))
    elements.append(Paragraph("<br/><br/>", styles['Normal']))

    # Datos de la tabla
    data = [['Fecha', 'ID Venta', 'ID Reembolso', 'Producto', 'Cantidad', 'Total', 'Usuario', 'Observaciones']]
    for reembolso in reembolsos:
        for detalle in reembolso.detalles.all():
            data.append([
                reembolso.fecha_hora.strftime('%Y-%m-%d %H:%M'),
                str(reembolso.venta.numero_venta if reembolso.venta.numero_venta else reembolso.venta.id_venta),
                str(reembolso.numero_reembolso if reembolso.numero_reembolso else reembolso.id_reembolso),
                detalle.producto.nombre,
                str(detalle.cantidad),
                f"${detalle.monto:,.0f}",
                reembolso.usuario.nombre_usuario if reembolso.usuario else '',
                reembolso.observaciones or ''
            ])

    # Crear la tabla
    table = Table(data)
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 10),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('ALIGN', (3, 1), (4, -1), 'RIGHT'),
    ]))
    elements.append(table)

    # Total
    total = reembolsos.aggregate(total=models.Sum('total_devuelto'))['total'] or 0
    elements.append(Paragraph(f"<br/>Total Reembolsado: ${total:,.0f}", styles['Heading2']))

    # Generar PDF
    doc.build(elements)
    buffer.seek(0)

    # Preparar la respuesta
    response = HttpResponse(buffer.read(), content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename=reembolsos_{datetime.now().strftime("%Y%m%d_%H%M")}.pdf'
    return response

@require_POST
def eliminar_reembolso(request, id_reembolso):
    try:
        reembolso = get_object_or_404(Reembolso, id_reembolso=id_reembolso)

        with transaction.atomic():
            # Obtener la venta asociada
            venta = reembolso.venta

            # Asegurar que la venta tenga un número de venta asignado
            if not venta.numero_venta:
                venta.asignar_numero_venta()

            # Guardar datos del reembolso antes de eliminar para poder restaurarlo
            reembolso_data = {
                'id_reembolso': reembolso.id_reembolso,
                'numero_reembolso': reembolso.numero_reembolso,
                'fecha_hora': reembolso.fecha_hora.isoformat(),
                'total_devuelto': float(reembolso.total_devuelto),
                'observaciones': reembolso.observaciones,
                'venta_id': venta.id_venta,
                'usuario_id': reembolso.usuario.id_usuario if reembolso.usuario else None,
                'detalles': []
            }

            # Guardar detalles del reembolso
            for detalle_reembolso in reembolso.detalles.all():
                reembolso_data['detalles'].append({
                    'producto_id': detalle_reembolso.producto.id_producto,
                    'cantidad': detalle_reembolso.cantidad,
                    'monto': float(detalle_reembolso.monto)
                })

            # Devolver las cantidades reembolsadas a la venta original
            for detalle_reembolso in reembolso.detalles.all():
                producto = detalle_reembolso.producto
                cantidad_reembolsada = detalle_reembolso.cantidad

                # Buscar el detalle de venta correspondiente
                try:
                    detalle_venta = venta.detalles.get(producto=producto)
                    # Aumentar la cantidad en la venta original
                    detalle_venta.cantidad += cantidad_reembolsada
                    detalle_venta.subtotal = detalle_venta.cantidad * detalle_venta.precio_unitario
                    detalle_venta.save()

                    # Actualizar el estado del detalle de venta
                    detalle_venta.actualizar_estado()

                    # Reducir el stock (porque se devuelve a la venta)
                    producto.stock_actual -= cantidad_reembolsada
                    producto.save()

                except DetalleVenta.DoesNotExist:
                    # Si no existe el detalle de venta, crear uno nuevo
                    DetalleVenta.objects.create(
                        venta=venta,
                        producto=producto,
                        cantidad=cantidad_reembolsada,
                        precio_unitario=producto.precio_unitario,
                        subtotal=cantidad_reembolsada * producto.precio_unitario
                    )

                    # Reducir el stock
                    producto.stock_actual -= cantidad_reembolsada
                    producto.save()

            # Guardar el número de reembolso antes de eliminar
            numero_reembolso_mostrar = reembolso.numero_reembolso if reembolso.numero_reembolso else reembolso.id_reembolso

            # Eliminar el reembolso
            reembolso.delete()

            # Actualizar el total de la venta
            venta.actualizar_total()

            # Forzar la actualización del estado de la venta
            venta.actualizar_estado()

            # Recargar la venta para obtener el estado actualizado
            venta.refresh_from_db()

            # Guardar datos en sessionStorage para poder restaurar
            request.session['reembolso_eliminado'] = reembolso_data

            # Usar el número de venta actual en el mensaje
            numero_venta_mostrar = venta.numero_venta if venta.numero_venta else venta.id_venta

            return JsonResponse({
                'success': True,
                'message': f'Reembolso #{numero_reembolso_mostrar} cancelado correctamente. Las cantidades han sido devueltas a la salida #{numero_venta_mostrar}.',
                'reembolso_id': id_reembolso,
                'venta_estado': venta.estado,
                'venta_id': venta.id_venta
            })

    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': f'Error al cancelar el reembolso: {str(e)}'
        })

    return JsonResponse({
        'success': False,
        'message': 'Método no permitido.'
    })

@require_POST
def restaurar_reembolso(request, id_reembolso):
    try:
        # Obtener datos del reembolso eliminado de la sesión
        reembolso_data = request.session.get('reembolso_eliminado')
        if not reembolso_data:
            return JsonResponse({
                'success': False,
                'message': 'No se encontraron datos del reembolso para restaurar.'
            })

        with transaction.atomic():
            # Obtener la venta
            venta = get_object_or_404(Venta, id_venta=reembolso_data['venta_id'])

            # Obtener el usuario
            usuario = None
            if reembolso_data['usuario_id']:
                usuario = get_object_or_404(Usuario, id_usuario=reembolso_data['usuario_id'])

            # Crear el reembolso
            reembolso = Reembolso.objects.create(
                numero_reembolso=reembolso_data['numero_reembolso'],
                fecha_hora=reembolso_data['fecha_hora'],
                total_devuelto=reembolso_data['total_devuelto'],
                observaciones=reembolso_data['observaciones'],
                venta=venta,
                usuario=usuario
            )

            # Crear los detalles del reembolso
            for detalle_data in reembolso_data['detalles']:
                producto = get_object_or_404(Producto, id_producto=detalle_data['producto_id'])
                ReembolsoDetalle.objects.create(
                    reembolso=reembolso,
                    producto=producto,
                    cantidad=detalle_data['cantidad'],
                    monto=detalle_data['monto']
                )

                # Buscar el detalle de venta correspondiente
                try:
                    detalle_venta = venta.detalles.get(producto=producto)
                    # Reducir la cantidad en la venta original
                    detalle_venta.cantidad -= detalle_data['cantidad']
                    detalle_venta.subtotal = detalle_venta.cantidad * detalle_venta.precio_unitario
                    detalle_venta.save()

                    # Actualizar el estado del detalle de venta
                    detalle_venta.actualizar_estado()

                    # Aumentar el stock (porque se quita de la venta)
                    producto.stock_actual += detalle_data['cantidad']
                    producto.save()

                except DetalleVenta.DoesNotExist:
                    # Si no existe el detalle de venta, no hacer nada
                    pass

            # Actualizar el total de la venta
            venta.actualizar_total()

            # Forzar la actualización del estado de la venta
            venta.actualizar_estado()

            # Recargar la venta para obtener el estado actualizado
            venta.refresh_from_db()

            # Limpiar datos de la sesión
            del request.session['reembolso_eliminado']

            numero_reembolso_mostrar = reembolso.numero_reembolso if reembolso.numero_reembolso else reembolso.id_reembolso

            # Obtener datos del reembolso restaurado para actualizar la tabla
            reembolso_data = {
                'id_reembolso': reembolso.id_reembolso,
                'numero_reembolso': numero_reembolso_mostrar,
                'fecha_hora': reembolso.fecha_hora.strftime('%d/%m/%Y %H:%M'),
                'total_devuelto': float(reembolso.total_devuelto),
                'observaciones': reembolso.observaciones or '',
                'usuario_nombre': reembolso.usuario.nombre_usuario if reembolso.usuario else 'Sin usuario',
                'venta_id': venta.id_venta,
                'venta_numero': venta.numero_venta if venta.numero_venta else venta.id_venta,
                'detalles': []
            }

            # Obtener detalles del reembolso
            for detalle in reembolso.detalles.all():
                reembolso_data['detalles'].append({
                    'producto_nombre': detalle.producto.nombre,
                    'cantidad': detalle.cantidad,
                    'precio_unitario': float(detalle.producto.precio_unitario),
                    'monto': float(detalle.monto)
                })

            return JsonResponse({
                'success': True,
                'message': f'Reembolso #{numero_reembolso_mostrar} restaurado correctamente.',
                'reembolso_data': reembolso_data,
                'venta_estado': venta.estado
            })

    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': f'Error al restaurar el reembolso: {str(e)}'
        })

    return JsonResponse({
        'success': False,
        'message': 'Método no permitido.'
    })

@require_GET
def obtener_estado_venta(request, id_venta):
    """Vista AJAX para obtener el estado actualizado de una venta y sus detalles"""
    try:
        venta = get_object_or_404(Venta, id_venta=id_venta)

        # Actualizar el estado de la venta
        venta.actualizar_estado()
        venta.refresh_from_db()

        # Obtener el estado actualizado de los detalles
        detalles_estado = []
        for detalle in venta.detalles.all():
            detalle.actualizar_estado()
            detalle.refresh_from_db()
            detalles_estado.append({
                'id_detalle': detalle.id_detalle,
                'estado': detalle.estado,
                'cantidad': detalle.cantidad,
                'subtotal': float(detalle.subtotal)
            })

        return JsonResponse({
            'success': True,
            'venta_estado': venta.estado,
            'total_venta': float(venta.total_venta),
            'detalles': detalles_estado
        })

    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': f'Error al obtener el estado de la venta: {str(e)}'
        })

def boleta_venta(request, id_venta):
    # Leer configuración desde la base de datos
    config = ConfiguracionBoleta.objects.first()
    NEGOCIO_NOMBRE = config.nombre if config else "Mi Negocio"
    NEGOCIO_DIRECCION = config.direccion if config else "Dirección del negocio"
    NEGOCIO_FONO = config.fono if config else "Teléfono de contacto"
    NEGOCIO_RUT = config.rut if config else "RUT/NIT: 00.000.000-0"
    LOGO_PATH = config.logo.path if config and config.logo else None

    venta = get_object_or_404(Venta, id_venta=id_venta)
    detalles = venta.detalles.select_related('producto').all()
    usuario = venta.usuario.nombre_usuario if venta.usuario else '—'
    observaciones = venta.observaciones or '—'
    # Convertir la fecha a la zona horaria local antes de formatear
    from django.utils import timezone
    fecha_local = timezone.localtime(venta.fecha) if timezone.is_aware(venta.fecha) else venta.fecha
    fecha = fecha_local.strftime('%d-%m-%Y') if hasattr(fecha_local, 'strftime') else str(fecha_local)
    numero_venta_mostrar = venta.numero_venta if venta.numero_venta else venta.id_venta
    nro_boleta = str(numero_venta_mostrar).zfill(6)

    correo = config.correo if config else ""
    sitio_web = config.sitio_web if config else ""
    mensaje_pie = config.mensaje_pie if config else "¡Gracias por su compra!"

    from io import BytesIO
    buffer = BytesIO()
    p = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter
    y = height - 40

    # Logo (si existe)
    if LOGO_PATH:
        try:
            from reportlab.lib.utils import ImageReader
            logo = ImageReader(LOGO_PATH)
            logo_width, logo_height = logo.getSize()
            max_logo_height = 50
            scale = max_logo_height / logo_height if logo_height > max_logo_height else 1
            display_width = logo_width * scale
            display_height = logo_height * scale
            x = (width - display_width) / 2
            p.drawImage(logo, x, y - display_height, width=display_width, height=display_height, mask='auto')
            y -= display_height + 25  # Más espacio después del logo
        except Exception as e:
            y -= 25

    # Encabezado
    p.setFont("Helvetica-Bold", 16)
    p.drawCentredString(width/2, y, NEGOCIO_NOMBRE)
    y -= 25
    p.setFont("Helvetica", 10)
    p.drawCentredString(width/2, y, NEGOCIO_DIRECCION)
    y -= 15
    p.drawCentredString(width/2, y, NEGOCIO_FONO)
    y -= 15
    p.drawCentredString(width/2, y, NEGOCIO_RUT)
    y -= 13
    if correo:
        p.drawCentredString(width/2, y, correo)
        y -= 13
    if sitio_web:
        p.drawCentredString(width/2, y, sitio_web)
        y -= 13
    y -= 10
    # Fecha y boleta
    p.setFont("Helvetica-Bold", 12)
    p.drawString(40, y, f"Fecha: {fecha}")
    p.drawString(220, y, f"N° Boleta: {nro_boleta}")
    y -= 18
    # Vendedor solo si hay nombre
    if usuario and usuario != '—':
        p.setFont("Helvetica", 10)
        p.drawString(40, y, f"Vendedor: {usuario}")
        y -= 15
    # Tabla de productos
    p.setFont("Helvetica-Bold", 10)
    x_producto = 60
    x_cant = x_producto + 140
    x_unit = x_cant + 50
    x_subt = x_unit + 70
    p.drawString(x_producto, y, "Producto")
    p.drawString(x_cant, y, "Cant.")
    p.drawString(x_unit, y, "P.Unitario")
    p.drawString(x_subt, y, "Subtotal")
    y -= 12
    p.setFont("Helvetica", 10)
    p.line(40, y, 500, y)
    y -= 10
    total = 0
    for det in detalles:
        if det.cantidad == 0:
            continue
        if y < 80:
            p.showPage()
            y = height - 40
        p.drawString(x_producto, y, str(det.producto.nombre))
        p.drawRightString(x_cant + 40, y, str(det.cantidad))
        p.drawRightString(x_unit + 60, y, f"${det.precio_unitario:,.0f}")
        p.drawRightString(x_subt + 60, y, f"${det.subtotal:,.0f}")
        total += det.subtotal
        y -= 15
    y -= 10
    # Totales
    p.setFont("Helvetica-Bold", 14)
    p.drawCentredString(width/2, y, "TOTAL A PAGAR")
    y -= 20
    p.setFont("Helvetica-Bold", 18)
    p.drawCentredString(width/2, y, f"${total:,.0f}")
    y -= 25
    p.setFont("Helvetica-Oblique", 9)
    p.setFillGray(0.4)
    p.drawCentredString(width/2, y, "IVA incluido en el precio")
    y -= 13
    p.drawCentredString(width/2, y, "Documento interno. No válido como boleta electrónica SII.")
    y -= 13
    if mensaje_pie:
        p.setFont("Helvetica", 10)
        p.setFillGray(0)
        p.drawCentredString(width/2, y, mensaje_pie)
    p.setFillGray(0)
    p.showPage()
    p.save()
    buffer.seek(0)
    return FileResponse(buffer, as_attachment=False, filename=f'boleta_venta_{numero_venta_mostrar}.pdf', content_type='application/pdf')

@require_http_methods(["GET", "POST"])
def configurar_boleta(request):
    config = ConfiguracionBoleta.objects.first()
    if request.method == "POST":
        nombre = request.POST.get("nombre", "Mi Negocio")
        direccion = request.POST.get("direccion", "Dirección del negocio")
        fono = request.POST.get("fono", "Teléfono de contacto")
        rut = request.POST.get("rut", "RUT/NIT: 00.000.000-0")
        correo = request.POST.get("correo", "")
        sitio_web = request.POST.get("sitio_web", "")
        mensaje_pie = request.POST.get("mensaje_pie", "¡Gracias por su compra!")
        logo = request.FILES.get("logo")
        if not config:
            config = ConfiguracionBoleta()
        config.nombre = nombre
        config.direccion = direccion
        config.fono = fono
        config.rut = rut
        config.correo = correo
        config.sitio_web = sitio_web
        config.mensaje_pie = mensaje_pie
        if logo:
            config.logo = logo
        config.save()
        return redirect(reverse('ventas'))
    nombre_usuario = request.session.get('usuario_nombre', 'Invitado')
    return render(request, 'venta/configurar_boleta.html', {
        "config": config,
        "nombre_usuario": nombre_usuario
    })

def eliminar_historial_ventas(request):
    # Verificar si el usuario está autenticado usando el sistema personalizado
    if not request.session.get('usuario_id'):
        return redirect('login')

    # Verificar que el usuario existe en la base de datos
    try:
        usuario = Usuario.objects.get(id_usuario=request.session.get('usuario_id'))
    except Usuario.DoesNotExist:
        messages.error(request, 'Usuario no encontrado.')
        return redirect('login')
    if request.method == 'POST':
        cantidad = request.POST.get('cantidad')
        custom_cantidad = request.POST.get('custom_cantidad')
        if cantidad == 'all':
            DetalleVenta.objects.all().delete()
            Venta.objects.all().delete()
            messages.success(request, '¡Historial de salidas eliminado correctamente!')
        else:
            try:
                n = int(custom_cantidad) if cantidad == 'custom' and custom_cantidad else int(cantidad)
                ids = list(Venta.objects.order_by('fecha').values_list('id_venta', flat=True)[:n])
                ventas_a_borrar = Venta.objects.filter(id_venta__in=ids)
                DetalleVenta.objects.filter(venta__in=ventas_a_borrar).delete()
                ventas_a_borrar.delete()
                messages.success(request, f'¡Se eliminaron las últimas {n} salidas correctamente!')
            except Exception:
                messages.error(request, 'No se pudo eliminar la cantidad seleccionada. Intenta nuevamente.')
    return redirect('ventas')

