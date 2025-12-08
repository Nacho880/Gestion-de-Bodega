from django.shortcuts import render, redirect, get_object_or_404
from django.contrib import messages
from django.http import JsonResponse, HttpResponse, FileResponse
from home.models import Compra, Producto, Codigo, DetalleCompra, Categoria, Proveedore, ProductoProveedore
from .forms import CompraForm, DetalleCompraForm
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
    carrito = request.session.get('carrito_compra', [])
    
    # Si el carrito no existe en la sesión, inicializarlo
    if 'carrito_compra' not in request.session:
        request.session['carrito_compra'] = []
        request.session.modified = True
        carrito = []
    
    return carrito

def save_cart(request, cart):
    request.session['carrito_compra'] = cart
    request.session.modified = True

def clear_cart(request):
    if 'carrito_compra' in request.session:
        del request.session['carrito_compra']
        request.session.modified = True
    # Limpiar también el proveedor de la sesión
    if 'proveedor_compra' in request.session:
        del request.session['proveedor_compra']
        request.session.modified = True
    # Asegurar que el carrito esté inicializado como lista vacía
    if 'carrito_compra' not in request.session:
        request.session['carrito_compra'] = []
        request.session.modified = True

def get_producto_or_none(producto_id):
    try:
        return Producto.objects.get(id_producto=producto_id)
    except Producto.DoesNotExist:
        return None

# --- Vistas de Carrito ---
def compras(request):
    mostrar = int(request.GET.get('mostrar', 5))
    orden = request.GET.get('orden', 'desc')
    fecha_inicio = request.GET.get('fecha_inicio')
    fecha_fin = request.GET.get('fecha_fin')
    search_query = request.GET.get('search', '').strip()
    filter_estados = request.GET.getlist('filter_estado')

    compras_qs = Compra.objects.filter(eliminado=False)
    if fecha_inicio:
        fecha_inicio_parsed = parse_date(fecha_inicio)
        if fecha_inicio_parsed:
            # Incluir desde el inicio del día
            fecha_inicio_datetime = timezone.make_aware(datetime.combine(fecha_inicio_parsed, time.min))
            compras_qs = compras_qs.filter(fecha__gte=fecha_inicio_datetime)
    if fecha_fin:
        fecha_fin_parsed = parse_date(fecha_fin)
        if fecha_fin_parsed:
            # Incluir hasta el final del día
            fecha_fin_datetime = timezone.make_aware(datetime.combine(fecha_fin_parsed, time.max))
            compras_qs = compras_qs.filter(fecha__lte=fecha_fin_datetime)
    if filter_estados:
        compras_qs = compras_qs.filter(estado__in=filter_estados)
    if search_query:
        # Buscar por nombre de proveedor
        compras_qs = compras_qs.filter(proveedor__nombre__icontains=search_query)

    if orden == 'asc':
        lista_compras = compras_qs.order_by('fecha', 'id_compra')
    else:
        lista_compras = compras_qs.order_by('-fecha', '-id_compra')
    nombre_usuario = request.session.get('usuario_nombre', 'Invitado')

    # Inicializar carrito explícitamente
    if 'carrito_compra' not in request.session:
        request.session['carrito_compra'] = []
        request.session.modified = True

    # Carrito actual en sesión
    carrito = get_cart(request)
    
    # Asegurar que el carrito sea una lista válida
    if carrito is None or not isinstance(carrito, list):
        carrito = []
        save_cart(request, carrito)
    
    productos_carrito = []
    total_carrito = Decimal('0.00')
    
    for item in carrito:
        try:
            producto = Producto.objects.get(id_producto=item['producto_id'])
            # Obtener precio del proveedor si está disponible
            precio_compra = item.get('precio_compra', producto.precio_unitario)
            # Convertir a Decimal para cálculos precisos
            precio_compra_decimal = Decimal(str(precio_compra))
            subtotal = precio_compra_decimal * item['cantidad']
            subtotal_float = float(subtotal)
            
            # Obtener el proveedor del carrito
            proveedor = None
            if 'proveedor_id' in item:
                try:
                    proveedor = Proveedore.objects.get(id_proveedor=item['proveedor_id'])
                except Proveedore.DoesNotExist:
                    pass
            
            productos_carrito.append({
                'producto': producto,
                'proveedor': proveedor,
                'cantidad': item['cantidad'],
                'precio_compra': float(precio_compra),
                'subtotal': subtotal_float
            })
            total_carrito += subtotal  # subtotal es Decimal, compatible con total_carrito
        except Producto.DoesNotExist:
            continue

    # Obtener todos los productos disponibles para el formulario
    productos = Producto.objects.all()
    categorias = Categoria.objects.all()
    proveedores = Proveedore.objects.all()

    # Obtener proveedor seleccionado si existe en la sesión Y el carrito no está vacío
    proveedor_seleccionado = None
    proveedor_id_sesion = request.session.get('proveedor_compra')
    if proveedor_id_sesion and len(carrito) > 0:
        try:
            proveedor_seleccionado = Proveedore.objects.get(id_proveedor=proveedor_id_sesion)
        except Proveedore.DoesNotExist:
            proveedor_seleccionado = None
    elif len(carrito) == 0 and proveedor_id_sesion:
        # Si el carrito está vacío pero hay proveedor en sesión, limpiarlo
        del request.session['proveedor_compra']
        request.session.modified = True

    # Obtener detalles de cada compra (agrupados)
    compras_con_detalles = []
    for compra in lista_compras:
        detalles = []
        total_compra = Decimal('0.00')
        # Mostrar todos los detalles, incluso si cantidad es 0
        for d in compra.detalles.select_related('producto').all():
            subtotal = d.cantidad * d.precio_compra
            subtotal_float = float(subtotal)
            
            # Usar el proveedor de la compra directamente
            detalles.append({
                'producto': d.producto,
                'proveedor': compra.proveedor,
                'cantidad': d.cantidad,
                'precio_compra': float(d.precio_compra),
                'subtotal': subtotal_float,
            })
            total_compra += subtotal  # subtotal es Decimal, compatible con total_compra
        compras_con_detalles.append({
            'compra': compra,
            'detalles': detalles,
            'total_compra': float(total_compra),
        })

    # Paginación: compras por página según 'mostrar'
    page_number = request.GET.get('page', 1)
    paginator = Paginator(compras_con_detalles, mostrar)
    page_obj = paginator.get_page(page_number)

    # Calcular total de compras filtradas
    total_compras = compras_qs.aggregate(total=models.Sum('total_compra'))['total'] or 0

    context = {
        'compras': lista_compras,
        'compras_con_detalles': page_obj.object_list,
        'page_obj': page_obj,
        'paginator': paginator,
        'nombre_usuario': nombre_usuario,
        'carrito': productos_carrito,
        'total_carrito': float(total_carrito),
        'productos': productos,
        'categorias': categorias,
        'proveedores': proveedores,
        'mostrar': mostrar,
        'orden': orden,
        'proveedor_seleccionado': proveedor_seleccionado,
        'filter_estados': filter_estados,
        'total_compras': total_compras,
    }
    
    # Si es una petición AJAX, devolver solo el contenido de la tabla
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return render(request, 'compra/partials/table_content.html', context)
    
    return render(request, 'compra/compras.html', context)

@require_POST
def agregar_a_carrito(request):
    if request.method == 'POST':
        producto_id = request.POST.get('producto_id')
        proveedor_id = request.POST.get('proveedor_id')
        
        if not producto_id or not producto_id.isdigit():
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': False,
                    'message': 'Debes seleccionar un producto válido.'
                })
            messages.error(request, 'Debes seleccionar un producto válido.')
            return redirect('compras')
            
        if not proveedor_id or not proveedor_id.isdigit():
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': False,
                    'message': 'Debes seleccionar un proveedor válido.'
                })
            messages.error(request, 'Debes seleccionar un proveedor válido.')
            return redirect('compras')

        # --- NUEVO: Lógica de un solo proveedor por compra ---
        proveedor_id = int(proveedor_id)
        carrito = get_cart(request)
        proveedor_sesion = request.session.get('proveedor_compra')
        if len(carrito) == 0:
            # Primer producto: guardar proveedor en sesión
            request.session['proveedor_compra'] = proveedor_id
            request.session.modified = True
        else:
            # Si ya hay productos, validar que el proveedor sea el mismo
            if proveedor_sesion and proveedor_id != proveedor_sesion:
                if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                    return JsonResponse({
                        'success': False,
                        'message': 'Solo puedes agregar productos del mismo proveedor en una compra. Vacía el carrito para cambiar de proveedor.'
                    })
                messages.error(request, 'Solo puedes agregar productos del mismo proveedor en una entrada. Vacía el carrito para cambiar de proveedor.')
                return redirect('compras')

        # --- FIN NUEVO ---

        try:
            cantidad = int(request.POST.get('cantidad', 1))
        except (TypeError, ValueError):
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': False,
                    'message': 'Cantidad inválida.'
                })
            messages.error(request, 'Cantidad inválida.')
            return redirect('compras')
            
        if cantidad <= 0:
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': False,
                    'message': 'La cantidad debe ser mayor a cero.'
                })
            messages.error(request, 'La cantidad debe ser mayor a cero.')
            return redirect('compras')
            
        producto = get_producto_or_none(producto_id)
        if not producto:
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': False,
                    'message': 'Producto no encontrado.'
                })
            messages.error(request, 'Producto no encontrado.')
            return redirect('compras')
            
        proveedor = get_object_or_404(Proveedore, id_proveedor=proveedor_id)
        
        # Obtener precio del proveedor si está disponible
        try:
            producto_proveedor = ProductoProveedore.objects.get(
                id_producto=producto, 
                id_proveedor=proveedor
            )
            precio_compra = producto_proveedor.precio_proveedor or producto.precio_unitario
        except ProductoProveedore.DoesNotExist:
            precio_compra = producto.precio_unitario
        
        # Convertir Decimal a float para JSON
        precio_compra_float = float(precio_compra)
        
        carrito = get_cart(request)
        
        # Verificar si el producto ya está en el carrito
        producto_existente = None
        for item in carrito:
            if item['producto_id'] == producto_id and item['proveedor_id'] == proveedor_id:
                producto_existente = item
                break
        
        if producto_existente:
            # Actualizar cantidad existente
            producto_existente['cantidad'] += cantidad
            producto_existente['precio_compra'] = precio_compra_float
        else:
            # Agregar nuevo producto al carrito
            carrito.append({
                'producto_id': producto_id,
                'proveedor_id': proveedor_id,
                'cantidad': cantidad,
                'precio_compra': precio_compra_float
            })
        
        save_cart(request, carrito)
        
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({
                'success': True,
                'message': f'{producto.nombre} agregado al carrito.',
                'carrito_count': len(carrito)
            })
        
        messages.success(request, f'{producto.nombre} agregado al carrito.')
        return redirect('compras')

@require_POST
def eliminar_de_carrito(request, producto_id):
    carrito = get_cart(request)
    carrito = [item for item in carrito if str(item['producto_id']) != str(producto_id)]
    save_cart(request, carrito)
    
    # Si el carrito quedó vacío, limpiar el proveedor de la sesión
    if len(carrito) == 0:
        if 'proveedor_compra' in request.session:
            del request.session['proveedor_compra']
            request.session.modified = True
    
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return JsonResponse({'success': True, 'message': 'Producto eliminado del carrito.'})
    messages.success(request, 'Producto eliminado del carrito.')
    return redirect('compras')

@require_POST
def editar_carrito(request, producto_id):
    if request.method == 'POST':
        try:
            nueva_cantidad = int(request.POST.get('cantidad', 1))
            print(f"DEBUG - Editando carrito compra: producto_id={producto_id}, nueva_cantidad={nueva_cantidad}")
        except (TypeError, ValueError):
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': False,
                    'message': 'Cantidad inválida.'
                })
            messages.error(request, 'Cantidad inválida.')
            return redirect('compras')
        if nueva_cantidad <= 0:
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': False,
                    'message': 'La cantidad debe ser mayor a cero.'
                })
            messages.error(request, 'La cantidad debe ser mayor a cero.')
            return redirect('compras')
        producto = get_producto_or_none(producto_id)
        if not producto:
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': False,
                    'message': 'Producto no encontrado.'
                })
            messages.error(request, 'Producto no encontrado.')
            return redirect('compras')
        
        # Validación de cantidad máxima para compras (evitar cantidades excesivas)
        # En compras no hay límite de stock real, pero limitamos a 9999 para evitar errores
        if nueva_cantidad > 9999:
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': False,
                    'message': 'La cantidad máxima permitida es 9999 unidades.'
                })
            messages.error(request, 'La cantidad máxima permitida es 9999 unidades.')
            return redirect('compras')
        
        carrito = get_cart(request)
        print(f"DEBUG - Carrito antes de editar: {carrito}")
        for item in carrito:
            if str(item['producto_id']) == str(producto_id):
                item['cantidad'] = nueva_cantidad
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
            return redirect('compras')
    return redirect('compras')

@require_POST
def finalizar_compra(request):
    carrito = get_cart(request)
    print(f"DEBUG - Carrito al finalizar compra: {carrito}")
    
    if not carrito:
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({
                'success': False,
                'message': 'El carrito está vacío.'
            })
        messages.error(request, 'El carrito está vacío.')
        return redirect('compras')
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
            compra = Compra.objects.create(
                usuario=usuario,
                observaciones=request.POST.get('observaciones', '')
            )
            total_compra = Decimal('0.00')
            for item in carrito:
                print(f"DEBUG - Procesando item del carrito: {item}")
                producto = Producto.objects.get(id_producto=item['producto_id'])
                proveedor = Proveedore.objects.get(id_proveedor=item['proveedor_id'])
                print(f"DEBUG - Creando detalle: {producto.nombre}, cantidad: {item['cantidad']}")
                detalle = DetalleCompra.objects.create(
                    compra=compra,
                    producto=producto,
                    cantidad=item['cantidad'],
                    precio_compra=Decimal(str(item['precio_compra'])),
                    subtotal=Decimal(str(item['precio_compra'])) * item['cantidad']
                )
                total_compra += detalle.subtotal
            compra.total_compra = total_compra
            compra.proveedor = Proveedore.objects.get(id_proveedor=carrito[0]['proveedor_id'])
            compra.save()
            clear_cart(request)
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': True,
                    'message': f'Entrada #{compra.id_compra} creada exitosamente.'
                })
            messages.success(request, f'Entrada #{compra.id_compra} creada exitosamente.')
            return redirect('compras')
    except Exception as e:
        print(f"DEBUG - Error en finalizar_compra: {str(e)}")
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({
                'success': False,
                'message': f'Error al crear la compra: {str(e)}'
            })
        messages.error(request, f'Error al crear la entrada: {str(e)}')
        return redirect('compras')

def agregar_compra(request):
    if request.method == 'POST':
        form = CompraForm(request.POST)
        if form.is_valid():
            compra = form.save(commit=False)
            compra.usuario = request.user if request.user.is_authenticated else None
            compra.save()
            messages.success(request, 'Entrada agregada exitosamente.')
            return redirect('compras')
    else:
        form = CompraForm()
    
    return render(request, 'compra/agregar_compra.html', {'form': form})

@require_POST
def eliminar_compra(request, id):
    try:
        compra = Compra.objects.get(id_compra=id)
        
        # Si la compra estaba entregada, restar el stock que se había sumado
        if compra.fecha_entrega:
            with transaction.atomic():
                for detalle in compra.detalles.all():
                    producto = detalle.producto
                    # Restar la cantidad actual del detalle (puede haber sido editada)
                    producto.stock_actual -= detalle.cantidad
                    producto.save()
        
        compra.soft_delete()
        
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({
                'success': True,
                'message': f'Entrada #{compra.id_compra} eliminada exitosamente.',
                'compra_id': compra.id_compra
            })
        
        messages.success(request, f'Entrada #{compra.id_compra} eliminada exitosamente.')
        return redirect('compras')
        
    except Compra.DoesNotExist:
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({
                'success': False,
                'message': 'Compra no encontrada.'
            })
        
        messages.error(request, 'Entrada no encontrada.')
        return redirect('compras')

@require_POST
def restaurar_compra(request, id):
    try:
        compra = Compra.all_objects.get(id_compra=id)
        
        # Verificar si la compra estaba entregada antes de restaurar
        compra_estaba_entregada = compra.fecha_entrega is not None
        
        compra.restore()
        
        # Si la compra estaba entregada, volver a sumar el stock
        if compra_estaba_entregada:
            with transaction.atomic():
                for detalle in compra.detalles.all():
                    producto = detalle.producto
                    # Sumar la cantidad actual del detalle
                    producto.stock_actual += detalle.cantidad
                    producto.save()
        
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({
                'success': True,
                'message': f'Entrada #{compra.id_compra} restaurada exitosamente.',
                'compra_id': compra.id_compra
            })
        
        messages.success(request, f'Entrada #{compra.id_compra} restaurada exitosamente.')
        return redirect('compras')
        
    except Compra.DoesNotExist:
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({
                'success': False,
                'message': 'Compra no encontrada.'
            })
        
        messages.error(request, 'Entrada no encontrada.')
        return redirect('compras')

@require_POST
def confirmar_entrega(request, id):
    try:
        compra = Compra.objects.get(id_compra=id)
        compra.fecha_entrega = timezone.now()
        
        # Guardar el usuario que confirmó la entrega
        usuario_id = request.session.get('usuario_id')
        if usuario_id:
            try:
                usuario_confirmo = Usuario.objects.get(id_usuario=usuario_id)
                compra.usuario_confirmo_entrega = usuario_confirmo
            except Usuario.DoesNotExist:
                pass
        
        # Guardar las observaciones de entrega si se proporcionan
        observaciones_entrega = request.POST.get('observaciones', '').strip()
        if observaciones_entrega:
            # Obtener la fecha/hora local
            fecha_local = timezone.localtime(timezone.now())
            fecha_formateada = fecha_local.strftime('%d/%m/%Y %H:%M')
            # Si ya hay observaciones, agregar las nuevas al final
            if compra.observaciones:
                compra.observaciones += f"\n--- Observaciones de entrega ({fecha_formateada}): {observaciones_entrega}"
            else:
                compra.observaciones = f"Observaciones de entrega ({fecha_formateada}): {observaciones_entrega}"
        
        compra.actualizar_estado()  # Esto cambiará el estado a 'ENTREGADO'
        compra.save()  # Guardar los cambios incluyendo las observaciones
        
        # Sumar stock SOLO al confirmar entrega
        for detalle in compra.detalles.all():
            producto = detalle.producto
            producto.stock_actual += detalle.cantidad
            producto.save()
        
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({
                'success': True,
                'message': f'Entrega de entrada #{compra.id_compra} confirmada.',
                'compra_id': compra.id_compra
            })
        messages.success(request, f'Entrega de entrada #{compra.id_compra} confirmada.')
        return redirect('compras')
    except Compra.DoesNotExist:
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({
                'success': False,
                'message': 'Compra no encontrada.'
            })
        messages.error(request, 'Entrada no encontrada.')
        return redirect('compras')

def validar_producto(request):
    producto_id = request.GET.get('producto_id')
    if producto_id:
        try:
            producto = Producto.objects.get(id_producto=producto_id)
            return JsonResponse({
                'existe': True,
                'nombre': producto.nombre,
                'precio': float(producto.precio_unitario)
            })
        except Producto.DoesNotExist:
            return JsonResponse({'existe': False})
    return JsonResponse({'existe': False})

def editar_compra(request, id):
    compra = get_object_or_404(Compra, id_compra=id)
    
    if request.method == 'POST':
        # Procesar cambios en las cantidades
        detalles = compra.detalles.all()
        total_compra = Decimal('0.00')
        
        # Verificar si la compra ya está entregada
        compra_entregada = compra.fecha_entrega is not None
        
        for detalle in detalles:
            nueva_cantidad = int(request.POST.get(f'cantidad_{detalle.id_detalle}', 0))
            cantidad_anterior = detalle.cantidad
            diferencia = nueva_cantidad - cantidad_anterior
            if nueva_cantidad >= 0:
                # Solo ajustar stock si la compra YA está entregada
                # (porque el stock ya se sumó cuando se entregó)
                if compra_entregada:
                    producto = detalle.producto
                    producto.stock_actual += diferencia
                    producto.save()
                
                # Actualizar detalle
                detalle.cantidad = nueva_cantidad
                detalle.subtotal = detalle.precio_compra * nueva_cantidad
                detalle.save()
                total_compra += detalle.subtotal
        
        # Actualizar total de la compra
        compra.total_compra = total_compra
        compra.observaciones = request.POST.get('observaciones', '')
        compra.save()
        
        messages.success(request, 'Entrada actualizada exitosamente.')
        return redirect('compras')
    
    # Obtener detalles de la compra con proveedores
    detalles = compra.detalles.select_related('producto').all()
    
    # Agregar información del proveedor a cada detalle
    detalles_con_proveedor = []
    for detalle in detalles:
        detalles_con_proveedor.append({
            'detalle': detalle,
            'producto': detalle.producto,
            'proveedor': compra.proveedor,
            'cantidad': detalle.cantidad,
            'precio_compra': detalle.precio_compra,
            'subtotal': detalle.subtotal
        })
    
    # Debug: imprimir información de los detalles
    print(f"DEBUG: Compra {compra.id_compra} tiene {len(detalles_con_proveedor)} detalles")
    for detalle_info in detalles_con_proveedor:
        print(f"DEBUG: Detalle {detalle_info['detalle'].id_detalle} - Producto: {detalle_info['producto'].nombre}, Cantidad: {detalle_info['cantidad']}, Precio: {detalle_info['precio_compra']}, Subtotal: {detalle_info['subtotal']}")
    
    return render(request, 'compra/editar_compra.html', {
        'compra': compra,
        'detalles': detalles_con_proveedor
    })

@csrf_exempt
@require_POST
def editar_compra_ajax(request, id):
    try:
        compra = Compra.objects.get(id_compra=id)
        # Lógica de edición AJAX aquí
        return JsonResponse({'success': True, 'message': 'Compra actualizada exitosamente.'})
    except Compra.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Compra no encontrada.'})

@require_GET
def autocomplete_productos(request):
    try:
        query = request.GET.get('q', '').strip()
        proveedor_id = request.GET.get('proveedor')
        
        print(f"DEBUG: query='{query}', proveedor_id='{proveedor_id}'")
        
        # Si hay proveedor seleccionado, buscar solo productos de ese proveedor
        if proveedor_id:
            print(f"DEBUG: Buscando productos para proveedor {proveedor_id}")
            
            # Verificar que el proveedor existe
            try:
                proveedor = Proveedore.objects.get(id_proveedor=proveedor_id)
                print(f"DEBUG: Proveedor encontrado: {proveedor.nombre}")
            except Proveedore.DoesNotExist:
                print(f"DEBUG: Proveedor {proveedor_id} no existe")
                return JsonResponse({'results': []})
            
            productos_proveedor = ProductoProveedore.objects.filter(
                id_proveedor_id=proveedor_id
            ).select_related('id_producto', 'id_producto__id_categoria')
            
            print(f"DEBUG: Encontrados {productos_proveedor.count()} productos para el proveedor")
            
            # Si no hay query, mostrar todos los productos del proveedor
            if not query:
                productos_filtrados = list(productos_proveedor)
            else:
                # Filtrar por nombre o código del producto
                productos_filtrados = []
                for pp in productos_proveedor:
                    producto = pp.id_producto
                    # Buscar coincidencia en nombre o códigos
                    if (query.lower() in producto.nombre.lower() or 
                        any(query.lower() in codigo.codigo.lower() for codigo in producto.codigo_set.all())):
                        productos_filtrados.append(pp)
        else:
            print("DEBUG: No hay proveedor seleccionado, buscando todos los productos")
            
            # Si no hay proveedor, buscar todos los productos
            if not query:
                productos = Producto.objects.all().select_related('id_categoria')
            else:
                productos = Producto.objects.filter(
                    Q(nombre__icontains=query) |
                    Q(codigo__codigo__icontains=query)
                ).distinct().select_related('id_categoria')
            
            productos_filtrados = []
            for producto in productos:
                # Crear un objeto similar a ProductoProveedore para mantener consistencia
                productos_filtrados.append(type('obj', (object,), {
                    'id_producto': producto
                })())
        
        print(f"DEBUG: Total productos filtrados: {len(productos_filtrados)}")
        
        # Ordenar por nombre del producto y limitar a 10
        productos_filtrados.sort(key=lambda x: x.id_producto.nombre)
        productos_filtrados = productos_filtrados[:10]
        
        results = []
        for pp in productos_filtrados:
            try:
                producto = pp.id_producto
                codigo = producto.codigo_set.first()
                # Mostrar precio del proveedor si está seleccionado, si no el precio base
                if proveedor_id and hasattr(pp, 'precio_proveedor') and pp.precio_proveedor is not None:
                    precio = float(pp.precio_proveedor)
                else:
                    precio = float(producto.precio_unitario)
                results.append({
                    'id': producto.id_producto,
                    'nombre': producto.nombre,
                    'codigo': codigo.codigo if codigo else '',
                    'precio_venta': precio,
                    'stock': producto.stock_actual,
                    'categoria': producto.id_categoria.nombre if producto.id_categoria else None
                })
            except Exception as e:
                print(f"Error procesando producto {pp}: {str(e)}")
                continue
        
        print(f"DEBUG: Resultados finales: {len(results)}")
        return JsonResponse({'results': results})
    except Exception as e:
        import traceback
        print(f"Error en autocomplete_productos: {str(e)}")
        print(f"Traceback: {traceback.format_exc()}")
        return JsonResponse({'results': [], 'error': str(e)}, status=500)

@require_GET
def autocomplete_proveedores(request):
    query = request.GET.get('q', '').strip()
    producto_id = request.GET.get('producto')
    
    # Si hay producto seleccionado, buscar solo proveedores de ese producto
    if producto_id:
        proveedores_producto = ProductoProveedore.objects.filter(
            id_producto_id=producto_id
        ).select_related('id_proveedor')
        
        # Si no hay query, mostrar todos los proveedores del producto
        if not query:
            proveedores_filtrados = [pp.id_proveedor for pp in proveedores_producto]
        else:
            # Filtrar por nombre del proveedor
            proveedores_filtrados = []
            for pp in proveedores_producto:
                proveedor = pp.id_proveedor
                if query.lower() in proveedor.nombre.lower():
                    proveedores_filtrados.append(proveedor)
    else:
        # Si no hay producto, buscar todos los proveedores
        if not query:
            proveedores_filtrados = list(Proveedore.objects.all())
        else:
            proveedores_filtrados = list(Proveedore.objects.filter(
                nombre__icontains=query
            ))
    
    # Ordenar por nombre y limitar a 10
    proveedores_filtrados = sorted(proveedores_filtrados, key=lambda x: x.nombre)[:10]
    
    results = []
    for p in proveedores_filtrados:
        results.append({
            'id': p.id_proveedor,
            'nombre': p.nombre,
            'telefono': p.telefono or '',
            'correo': p.correo or ''
        })
    
    return JsonResponse({'results': results})

@require_GET
def obtener_estado_compra(request, id_compra):
    try:
        compra = Compra.objects.get(id_compra=id_compra)
        return JsonResponse({
            'estado': compra.estado,
            'fecha_entrega': compra.fecha_entrega.isoformat() if compra.fecha_entrega else None
        })
    except Compra.DoesNotExist:
        return JsonResponse({'error': 'Compra no encontrada'}, status=404)

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

@require_GET
def verificar_compatibilidad(request):
    producto_id = request.GET.get('producto')
    proveedor_id = request.GET.get('proveedor')
    
    if not producto_id or not proveedor_id:
        return JsonResponse({'compatible': False})
    
    try:
        # Verificar si existe la relación ProductoProveedore
        compatible = ProductoProveedore.objects.filter(
            id_producto_id=producto_id,
            id_proveedor_id=proveedor_id
        ).exists()
        
        return JsonResponse({'compatible': compatible})
    except Exception as e:
        return JsonResponse({'compatible': False})

def eliminar_historial_compras(request):
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
            DetalleCompra.objects.all().delete()
            Compra.objects.all().delete()
            messages.success(request, '¡Historial de entradas eliminado correctamente!')
        else:
            try:
                n = int(custom_cantidad) if cantidad == 'custom' and custom_cantidad else int(cantidad)
                ids = list(Compra.objects.order_by('fecha').values_list('id_compra', flat=True)[:n])
                compras_a_borrar = Compra.objects.filter(id_compra__in=ids)
                DetalleCompra.objects.filter(compra__in=compras_a_borrar).delete()
                compras_a_borrar.delete()
                messages.success(request, f'¡Se eliminaron las últimas {n} entradas correctamente!')
            except Exception:
                messages.error(request, 'No se pudo eliminar la cantidad seleccionada. Intenta nuevamente.')
    return redirect('compras')
