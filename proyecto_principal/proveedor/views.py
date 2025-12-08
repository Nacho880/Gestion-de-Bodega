from django.shortcuts import render, redirect, get_object_or_404
from home.models import Proveedore, Producto, ProductoProveedore, Codigo
from .forms import ProveedoreForm
from django.contrib import messages
from django.http import JsonResponse
from django.db.models import Q
from django.views.decorators.http import require_GET
from django.core.paginator import Paginator
import json

def proveedores(request):
    nombre_usuario = request.session.get('usuario_nombre', 'Invitado')
    
    # Obtener parámetros de búsqueda y ordenamiento
    search_query = request.GET.get('search', '').strip()
    sort_field = request.GET.get('sort', 'nombre')
    order = request.GET.get('order', 'asc')
    per_page = int(request.GET.get('per_page', 10))
    
    # Obtener filtros
    filter_paises = request.GET.getlist('filter_pais')
    filter_ciudades = request.GET.getlist('filter_ciudad')
    filter_comunas = request.GET.getlist('filter_comuna')
    
    # Obtener todos los proveedores
    proveedores = Proveedore.objects.all()
    
    # Aplicar filtros
    if filter_paises:
        proveedores = proveedores.filter(pais__in=filter_paises)
    if filter_ciudades:
        proveedores = proveedores.filter(ciudad__in=filter_ciudades)
    if filter_comunas:
        proveedores = proveedores.filter(comuna__in=filter_comunas)
    
    # Aplicar búsqueda
    if search_query:
        proveedores = proveedores.filter(
            Q(nombre__icontains=search_query) |
            Q(direccion__icontains=search_query) |
            Q(telefono__icontains=search_query) |
            Q(correo__icontains=search_query) |
            Q(pais__icontains=search_query) |
            Q(ciudad__icontains=search_query) |
            Q(comuna__icontains=search_query)
        )
    
    # Aplicar ordenamiento
    sort_fields_map = {
        'nombre': 'nombre',
        'telefono': 'telefono',
        'email': 'correo',
        'pais': 'pais',
        'ciudad': 'ciudad',
        'comuna': 'comuna',
    }
    
    if sort_field in sort_fields_map:
        sort_key = sort_fields_map[sort_field]
        if order == 'desc':
            sort_key = f'-{sort_key}'
        proveedores = proveedores.order_by(sort_key)
    else:
        proveedores = proveedores.order_by('nombre')
    
    # Obtener valores únicos para los filtros
    paises = sorted(Proveedore.objects.values_list('pais', flat=True).distinct().exclude(pais__isnull=True).exclude(pais=''))
    ciudades = sorted(Proveedore.objects.values_list('ciudad', flat=True).distinct().exclude(ciudad__isnull=True).exclude(ciudad=''))
    comunas = sorted(Proveedore.objects.values_list('comuna', flat=True).distinct().exclude(comuna__isnull=True).exclude(comuna=''))
    
    # Paginación
    paginator = Paginator(proveedores, per_page)
    page_number = request.GET.get('page', 1)
    page_obj = paginator.get_page(page_number)
    
    # Si es una petición AJAX, devolver solo el contenido de la tabla
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return render(request, 'proveedor/partials/table_content.html', {
            'proveedores': page_obj,
            'page_obj': page_obj,
            'search_query': search_query,
            'sort_field': sort_field,
            'order': order,
        })
    
    return render(request, 'proveedor/proveedores.html', {
        'proveedores': page_obj,
        'page_obj': page_obj,
        'nombre_usuario': nombre_usuario,
        'search_query': search_query,
        'sort_field': sort_field,
        'order': order,
        'paises': paises,
        'ciudades': ciudades,
        'comunas': comunas,
        'filter_paises': filter_paises,
        'filter_ciudades': filter_ciudades,
        'filter_comunas': filter_comunas,
    })

def obtener_detalles_proveedor(request, proveedor_id):
    """Obtener todos los detalles de un proveedor"""
    try:
        proveedor = get_object_or_404(Proveedore, pk=proveedor_id)
        
        return JsonResponse({
            'success': True,
            'proveedor': {
                'id': proveedor.id_proveedor,
                'nombre': proveedor.nombre or 'Sin nombre',
                'telefono': proveedor.telefono_completo if proveedor.telefono else 'Sin teléfono',
                'correo': proveedor.correo or 'Sin correo',
                'direccion': proveedor.direccion or 'Sin dirección',
                'pais': proveedor.pais or 'Sin país',
                'ciudad': proveedor.ciudad or 'Sin ciudad',
                'comuna': proveedor.comuna or 'Sin comuna'
            }
        })
    except Proveedore.DoesNotExist:
        return JsonResponse({
            'success': False,
            'message': 'Proveedor no encontrado'
        })

def agregar_proveedor(request):
    if request.method == 'POST':
        form = ProveedoreForm(request.POST)
        if form.is_valid():
            proveedor = form.save()
            return JsonResponse({
                'success': True,
                'message': f'Proveedor <strong>{proveedor.nombre}</strong> agregado.'
            })
        else:
            errors = {}
            for field, error_list in form.errors.items():
                errors[field] = error_list[0]
            return JsonResponse({
                'success': False,
                'message': 'Error al agregar el proveedor.',
                'errors': errors
            })
    
    return JsonResponse({
        'success': False,
        'message': 'Método no permitido.'
    }, status=405)

def editar_proveedor(request, id):
    proveedor = get_object_or_404(Proveedore, pk=id)
    if request.method == 'POST':
        form = ProveedoreForm(request.POST, instance=proveedor)
        if form.is_valid():
            form.save()
            return JsonResponse({
                'success': True,
                'message': f'Proveedor <strong>{proveedor.nombre}</strong> editado.'
            })
        else:
            errors = {}
            for field, error_list in form.errors.items():
                errors[field] = error_list[0]
            return JsonResponse({
                'success': False,
                'message': 'Error al editar el proveedor.',
                'errors': errors
            })
    
    return JsonResponse({
        'success': False,
        'message': 'Método no permitido.'
    }, status=405)

def eliminar_proveedor(request, id):
    if request.method == 'POST':
        proveedor = get_object_or_404(Proveedore, id_proveedor=id)
        try:
            proveedor.soft_delete()
            return JsonResponse({
                'success': True,
                'message': f'El proveedor <strong>{proveedor.nombre}</strong> fue eliminado.',
                'proveedor_id': proveedor.id_proveedor
            })
        except ValueError as e:
            return JsonResponse({
                'success': False,
                'message': str(e)
            })
        except Exception as e:
            return JsonResponse({
                'success': False,
                'message': 'Error al eliminar el proveedor.'
            })
    
    return JsonResponse({
        'success': False,
        'message': 'Método no permitido.'
    }, status=405)

def restaurar_proveedor(request, id):
    if request.method == 'POST':
        proveedor = get_object_or_404(Proveedore.all_objects, id_proveedor=id, eliminado=True)
        try:
            proveedor.restore()
            return JsonResponse({
                'success': True,
                'message': 'Proveedor restaurado correctamente.'
            })
        except Exception as e:
            return JsonResponse({
                'success': False,
                'message': 'Error al restaurar el proveedor.'
            })
    
    return JsonResponse({
        'success': False,
        'message': 'Método no permitido.'
    }, status=405)

def proveedor_producto(request, proveedor_id):
    from django.db.models import Q
    from django.core.paginator import Paginator
    
    proveedor = get_object_or_404(Proveedore, pk=proveedor_id)
    
    # Obtener parámetros de búsqueda y ordenamiento
    search_query = request.GET.get('search', '').strip()
    sort_field = request.GET.get('sort', 'id_producto__nombre')
    order = request.GET.get('order', 'asc')
    per_page = int(request.GET.get('per_page', 10))
    
    # Obtener productos del proveedor
    producto_proveedores = ProductoProveedore.objects.filter(id_proveedor=proveedor).select_related('id_producto')
    
    # Aplicar búsqueda
    if search_query:
        # Buscar códigos relacionados y obtener los IDs de productos
        from home.models import Codigo
        codigos_productos_ids = list(Codigo.objects.filter(
            codigo__icontains=search_query
        ).values_list('id_producto_id', flat=True))
        
        # Construir la consulta de búsqueda
        search_filters = Q(id_producto__nombre__icontains=search_query) | Q(id_producto__marca__icontains=search_query)
        
        # Si hay códigos encontrados, agregar filtro por IDs de productos
        if codigos_productos_ids:
            search_filters |= Q(id_producto_id__in=codigos_productos_ids)
        
        producto_proveedores = producto_proveedores.filter(search_filters).distinct()
    
    # Aplicar ordenamiento
    sort_fields_map = {
        'nombre': 'id_producto__nombre',
        'marca': 'id_producto__marca',
        'stock': 'id_producto__stock_actual',
        'precio_venta': 'id_producto__precio_unitario',
        'precio_proveedor': 'precio_proveedor',
    }
    
    if sort_field in sort_fields_map:
        sort_key = sort_fields_map[sort_field]
        if order == 'desc':
            sort_key = f'-{sort_key}'
        producto_proveedores = producto_proveedores.order_by(sort_key)
    else:
        producto_proveedores = producto_proveedores.order_by('id_producto__nombre')
    
    # Paginación
    paginator = Paginator(producto_proveedores, per_page)
    page_number = request.GET.get('page', 1)
    page_obj = paginator.get_page(page_number)
    
    productos_no_en_proveedor = Producto.objects.exclude(
        id_producto__in=producto_proveedores.values_list('id_producto_id', flat=True)
    )
    
    nombre_usuario = request.session.get('usuario_nombre', 'Invitado')

    # Verificar si es una petición AJAX
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return render(request, 'proveedor/partials/proveedor_producto_table.html', {
            'proveedor': proveedor,
            'producto_proveedores': page_obj,
            'page_obj': page_obj,
            'search_query': search_query,
            'sort_field': sort_field,
            'order': order,
        })

    return render(request, 'proveedor/proveedor_producto.html', {
        'proveedor': proveedor,
        'producto_proveedores': page_obj,
        'page_obj': page_obj,
        'productos_no_en_proveedor': productos_no_en_proveedor,
        'nombre_usuario': nombre_usuario,
        'search_query': search_query,
        'sort_field': sort_field,
        'order': order,
    })

def agregar_producto_proveedor(request, proveedor_id):
    if request.method == 'POST':
        proveedor = get_object_or_404(Proveedore, pk=proveedor_id)
        producto_id = request.POST.get('producto_id')
        precio_proveedor = request.POST.get('precio_proveedor')
        
        if producto_id and precio_proveedor:
            producto = get_object_or_404(Producto, id_producto=producto_id)
            
            producto_proveedor, created = ProductoProveedore.objects.get_or_create(
                id_proveedor=proveedor,
                id_producto=producto,
                defaults={'precio_proveedor': precio_proveedor}
            )
            
            if not created:
                producto_proveedor.precio_proveedor = precio_proveedor
                producto_proveedor.save()
            
            # Verificar si es una petición AJAX
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                producto_data = {
                    'id': producto.id_producto,
                    'nombre': producto.nombre or 'Sin nombre',
                    'marca': producto.marca or 'Sin marca',
                    'precio_proveedor': float(producto_proveedor.precio_proveedor)
                }
                return JsonResponse({
                    'success': True,
                    'message': f'Producto <strong>{producto.nombre}</strong> agregado al proveedor <strong>{proveedor.nombre}</strong>.',
                    'producto': producto_data
                })
            else:
                messages.success(request, f"Producto {producto.nombre} agregado al proveedor {proveedor.nombre} con precio ${precio_proveedor}.")
                return redirect('proveedor_producto', proveedor_id=proveedor_id)
        else:
            # Verificar si es una petición AJAX
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': False,
                    'message': 'No se seleccionó ningún producto o no se especificó el precio.'
                })
            else:
                messages.error(request, "No se seleccionó ningún producto o no se especificó el precio.")
                return redirect('proveedor_producto', proveedor_id=proveedor_id)
    
    # Si no es POST, redirigir
    return redirect('proveedor_producto', proveedor_id=proveedor_id)

def editar_precio_proveedor(request, proveedor_id, producto_id):
    if request.method == 'POST':
        proveedor = get_object_or_404(Proveedore, pk=proveedor_id)
        producto = get_object_or_404(Producto, id_producto=producto_id)
        nuevo_precio = request.POST.get('precio_proveedor')
        
        if nuevo_precio:
            producto_proveedor = get_object_or_404(ProductoProveedore, 
                                                 id_proveedor=proveedor, 
                                                 id_producto=producto)
            producto_proveedor.precio_proveedor = nuevo_precio
            producto_proveedor.save()
            messages.success(request, f"Precio actualizado para {producto.nombre} a ${nuevo_precio}.")
    
    return redirect('proveedor_producto', proveedor_id=proveedor_id)

def eliminar_producto_proveedor(request, producto_id, proveedor_id):
    if request.method == 'POST':
        try:
            proveedor = get_object_or_404(Proveedore, id_proveedor=proveedor_id)
            producto = get_object_or_404(Producto, id_producto=producto_id)
            
            producto_proveedor = get_object_or_404(ProductoProveedore, 
                                                 id_proveedor=proveedor, 
                                                 id_producto=producto)
            nombre_producto = producto.nombre
            producto_proveedor.delete()
            
            # Verificar si es una petición AJAX
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': True,
                    'message': f'El producto <strong>{producto.nombre}</strong> fue eliminado del proveedor.'
                })
            else:
                messages.error(request, f"Producto {nombre_producto} eliminado del proveedor {proveedor.nombre}.")
                return redirect('proveedor_producto', proveedor_id=proveedor_id)
        except ProductoProveedore.DoesNotExist:
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': False,
                    'message': 'El producto no está asociado a este proveedor o ya fue eliminado.'
                })
            else:
                messages.warning(request, "El producto no está asociado a este proveedor o ya fue eliminado.")
                return redirect('proveedor_producto', proveedor_id=proveedor_id)
        except Exception as e:
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': False,
                    'message': f'Error al eliminar el producto: {str(e)}'
                })
            else:
                messages.error(request, f"Error al eliminar el producto: {str(e)}")
                return redirect('proveedor_producto', proveedor_id=proveedor_id)
    
    # Si no es POST, redirigir
    return redirect('proveedor_producto', proveedor_id=proveedor_id)

def restaurar_producto_proveedor(request, proveedor_id, producto_id):
    """Vista AJAX para restaurar producto eliminado del proveedor"""
    if request.method == 'POST':
        try:
            proveedor = get_object_or_404(Proveedore, id_proveedor=proveedor_id)
            producto = get_object_or_404(Producto, id_producto=producto_id)
            
            # Verificar si ya existe la relación
            if ProductoProveedore.objects.filter(id_proveedor=proveedor, id_producto=producto).exists():
                return JsonResponse({
                    'success': False,
                    'message': 'El producto ya está asociado a este proveedor.'
                })
            
            # Obtener el precio del proveedor del request si está disponible
            precio_proveedor = request.POST.get('precio_proveedor')
            
            # Crear la relación producto-proveedor con el precio original
            producto_proveedor = ProductoProveedore.objects.create(
                id_proveedor=proveedor,
                id_producto=producto,
                precio_proveedor=precio_proveedor if precio_proveedor else 0
            )
            
            return JsonResponse({
                'success': True,
                'message': 'Producto restaurado correctamente.',
                'precio_proveedor': producto_proveedor.precio_proveedor
            })
            
        except Exception as e:
            return JsonResponse({
                'success': False,
                'message': f'Error al restaurar el producto: {str(e)}'
            })
    
    return JsonResponse({
        'success': False,
        'message': 'Método no permitido.'
    }, status=405)

@require_GET
def autocomplete_productos_proveedor(request):
    """Vista AJAX para autocompletado de productos en proveedores"""
    query = request.GET.get('q', '').strip()
    proveedor_id = request.GET.get('proveedor')
    
    # Si no hay query, mostrar todos los productos disponibles para el proveedor
    if not query:
        productos = Producto.objects.all().select_related('id_categoria')
        
        # Excluir productos que ya están asociados al proveedor
        if proveedor_id:
            productos_asociados = ProductoProveedore.objects.filter(
                id_proveedor_id=proveedor_id
            ).values_list('id_producto_id', flat=True)
            productos = productos.exclude(id_producto__in=productos_asociados)
        
        # Limitar a 10 resultados y ordenar por nombre
        productos = productos.order_by('nombre')[:10]
        
        results = []
        for p in productos:
            codigo = p.codigo_set.first()
            results.append({
                'id': p.id_producto,
                'nombre': p.nombre,
                'codigo': codigo.codigo if codigo else '',
                'marca': p.marca,
                'precio_venta': float(p.precio_unitario),
                'stock': p.stock_actual,
                'categoria': p.id_categoria.nombre if p.id_categoria else None
            })
        
        return JsonResponse({'results': results})
    
    # Primero buscar coincidencia exacta por nombre o código
    producto_exacto = Producto.objects.filter(
        Q(nombre__iexact=query) | 
        Q(codigo__codigo__iexact=query)
    ).first()
    
    if producto_exacto:
        # Si hay coincidencia exacta, retornar solo ese producto
        codigo = producto_exacto.codigo_set.first()
        return JsonResponse({
            'results': [{
                'id': producto_exacto.id_producto,
                'nombre': producto_exacto.nombre,
                'codigo': codigo.codigo if codigo else '',
                'marca': producto_exacto.marca,
                'precio_venta': float(producto_exacto.precio_unitario),
                'stock': producto_exacto.stock_actual,
                'categoria': producto_exacto.id_categoria.nombre if producto_exacto.id_categoria else None
            }]
        })
    
    # Si no hay coincidencia exacta, buscar coincidencias parciales
    productos = Producto.objects.filter(
        Q(nombre__icontains=query) | 
        Q(codigo__codigo__icontains=query)
    ).distinct()
    
    # Excluir productos que ya están asociados al proveedor
    if proveedor_id:
        productos_asociados = ProductoProveedore.objects.filter(
            id_proveedor_id=proveedor_id
        ).values_list('id_producto_id', flat=True)
        productos = productos.exclude(id_producto__in=productos_asociados)
    
    # Limitar a 10 resultados y ordenar por nombre
    productos = productos.order_by('nombre')[:10]
    
    results = []
    for p in productos:
        codigo = p.codigo_set.first()
        results.append({
            'id': p.id_producto,
            'nombre': p.nombre,
            'codigo': codigo.codigo if codigo else '',
            'marca': p.marca,
            'precio_venta': float(p.precio_unitario),
            'stock': p.stock_actual,
            'categoria': p.id_categoria.nombre if p.id_categoria else None
        })
    
    return JsonResponse({'results': results})

@require_GET
def validar_codigo(request):
    codigo = request.GET.get('codigo', '').strip()
    if codigo:
        from home.models import Producto
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