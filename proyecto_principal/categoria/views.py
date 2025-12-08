from django.shortcuts import render, redirect, get_object_or_404
from django.http import JsonResponse
from home.models import Categoria, Producto 
from .forms import CategoriaForm
from django.contrib import messages
import json
from django.db import models
from django.db.models import Q
from django.views.decorators.http import require_GET
from django.core.paginator import Paginator


def categorias(request):
    nombre_usuario = request.session.get('usuario_nombre', 'Invitado')
    
    # Obtener parámetros de búsqueda y ordenamiento
    search_query = request.GET.get('search', '').strip()
    sort_field = request.GET.get('sort', 'nombre')
    order = request.GET.get('order', 'asc')
    per_page = int(request.GET.get('per_page', 10))
    
    # Obtener todas las categorías
    categorias = Categoria.objects.all()
    
    # Aplicar búsqueda
    if search_query:
        categorias = categorias.filter(
            Q(nombre__icontains=search_query) |
            Q(descripcion__icontains=search_query)
        )
    
    # Aplicar ordenamiento
    if sort_field in ['nombre', 'descripcion']:
        if order == 'desc':
            sort_field = f'-{sort_field}'
        categorias = categorias.order_by(sort_field)
    else:
        categorias = categorias.order_by('nombre')
    
    # Paginación
    paginator = Paginator(categorias, per_page)
    page_number = request.GET.get('page', 1)
    page_obj = paginator.get_page(page_number)
    
    # Si es una petición AJAX, devolver solo el contenido de la tabla
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return render(request, 'categoria/partials/table_content.html', {
            'categorias': page_obj,
            'page_obj': page_obj,
            'search_query': search_query,
            'sort_field': sort_field.replace('-', ''),
            'order': order,
        })
    
    return render(request, 'categoria/categorias.html', {
        'categorias': page_obj,
        'page_obj': page_obj,
        'nombre_usuario': nombre_usuario,
        'search_query': search_query,
        'sort_field': sort_field.replace('-', ''),
        'order': order,
    })


def agregar_categoria(request):
    if request.method == 'POST':
        form = CategoriaForm(request.POST)
        if form.is_valid():
            categoria = form.save()
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': True,
                    'message': f'Categoría <strong>{categoria.nombre}</strong> agregada.'
                })
            else:
                messages.success(request, "Categoría agregada correctamente.")
                return redirect('categorias')
        else:
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                errors = {}
                # Obtener el primer mensaje de error específico
                first_error = None
                for field, error_list in form.errors.items():
                    errors[field] = error_list[0]
                    if not first_error:
                        first_error = error_list[0]
                return JsonResponse({
                    'success': False,
                    'message': first_error or 'Error al agregar la categoría. Por favor, corrige los errores.',
                    'errors': errors
                })
            else:
                messages.error(request, "Error al agregar la categoría. Por favor, corrige los errores.")
    else:
        form = CategoriaForm()
    return render(request, 'categoria/form_categoria.html', {'form': form, 'accion': 'Agregar'})


def editar_categoria(request, id):
    categoria = get_object_or_404(Categoria, pk=id)
    if request.method == 'POST':
        form = CategoriaForm(request.POST, instance=categoria)
        if form.is_valid():
            form.save()
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': True,
                    'message': f'Categoría <strong>{categoria.nombre}</strong> editada.'
                })
            else:
                messages.success(request, "Categoría editada correctamente.")
                return redirect('categorias')
        else:
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                errors = {}
                # Obtener el primer mensaje de error específico
                first_error = None
                for field, error_list in form.errors.items():
                    errors[field] = error_list[0]
                    if not first_error:
                        first_error = error_list[0]
                return JsonResponse({
                    'success': False,
                    'message': first_error or 'Error al editar la categoría.',
                    'errors': errors
                })
            else:
                messages.error(request, "Error al editar la categoría. ")
    else:
        form = CategoriaForm(instance=categoria)
    return render(request, 'categoria/form_categoria.html', {'form': form, 'accion': 'Editar'})


def eliminar_categoria(request, id):
    if request.method == 'POST':
        categoria = get_object_or_404(Categoria, id_categoria=id)
        
        # Verificar si es una petición AJAX
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            try:
                categoria.soft_delete()
                return JsonResponse({
                    'success': True,
                    'message': f'La categoría <strong>{categoria.nombre}</strong> fue eliminada.'
                })
            except Exception as e:
                return JsonResponse({
                    'success': False,
                    'message': f'Error al eliminar la categoría: {str(e)}'
                })
        else:
            # Petición normal (no AJAX)
            categoria.delete()
            messages.error(request, "Categoría eliminada correctamente.")
            return redirect('categorias')
    
    return redirect('categorias')


def restaurar_categoria(request, id):
    if request.method == 'POST':
        try:
            categoria = Categoria.all_objects.get(id_categoria=id, eliminado=True)
            categoria.restore()
            return JsonResponse({
                'success': True,
                'message': 'Categoría restaurada correctamente.'
            })
        except Categoria.DoesNotExist:
            return JsonResponse({
                'success': False,
                'message': 'La categoría no existe o no fue eliminada.'
            })
        except Exception as e:
            return JsonResponse({
                'success': False,
                'message': f'Error al restaurar la categoría: {str(e)}'
            })
    
    return JsonResponse({
        'success': False,
        'message': 'Método no permitido.'
    })


def categoria_producto(request, categoria_id):
    from django.db.models import Q
    from django.core.paginator import Paginator
    
    categoria = get_object_or_404(Categoria, pk=categoria_id)
    # Productos que no están en esta categoría (ni por id_categoria ni por categorias)
    productos_no_en_categoria = Producto.objects.exclude(
        Q(id_categoria=categoria) | Q(categorias=categoria)
    )
    nombre_usuario = request.session.get('usuario_nombre', 'Invitado')
    
    # Obtener parámetros de búsqueda y ordenamiento
    search_query = request.GET.get('search', '').strip()
    sort_field = request.GET.get('sort', 'nombre')
    order = request.GET.get('order', 'asc')
    per_page = int(request.GET.get('per_page', 10))
    
    # Obtener productos de la categoría (tanto por id_categoria como por categorias many-to-many)
    productos = Producto.objects.filter(
        Q(id_categoria=categoria) | Q(categorias=categoria)
    ).distinct()
    
    # Aplicar búsqueda
    if search_query:
        # Buscar códigos relacionados y obtener los IDs de productos
        from home.models import Codigo
        codigos_productos_ids = list(Codigo.objects.filter(
            codigo__icontains=search_query
        ).values_list('id_producto_id', flat=True))
        
        # Construir la consulta de búsqueda
        search_filters = Q(nombre__icontains=search_query) | Q(marca__icontains=search_query)
        
        # Si hay códigos encontrados, agregar filtro por IDs de productos
        if codigos_productos_ids:
            search_filters |= Q(id_producto__in=codigos_productos_ids)
        
        productos = productos.filter(search_filters).distinct()
    
    # Aplicar ordenamiento
    sort_fields_map = {
        'nombre': 'nombre',
        'marca': 'marca',
        'stock': 'stock_actual',
        'precio': 'precio_unitario',
    }
    
    if sort_field in sort_fields_map:
        sort_key = sort_fields_map[sort_field]
        if order == 'desc':
            sort_key = f'-{sort_key}'
        productos = productos.order_by(sort_key)
    else:
        productos = productos.order_by('nombre')
    
    # Paginación
    paginator = Paginator(productos, per_page)
    page_number = request.GET.get('page', 1)
    page_obj = paginator.get_page(page_number)

    # Verificar si es una petición AJAX
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        # Devolver solo el contenido de la tabla para actualización dinámica
        return render(request, 'categoria/partials/categoria_producto_table.html', {
            'categoria': categoria,
            'productos': page_obj,
            'page_obj': page_obj,
            'search_query': search_query,
            'sort_field': sort_field,
            'order': order,
        })

    return render(request, 'categoria/categoria_producto.html', {
        'categoria': categoria,
        'productos': page_obj,
        'page_obj': page_obj,
        'productos_no_en_categoria': productos_no_en_categoria,
        'nombre_usuario': nombre_usuario,
        'search_query': search_query,
        'sort_field': sort_field,
        'order': order,
    })


def agregar_producto_categoria(request, categoria_id):
    if request.method == 'POST':
        categoria = get_object_or_404(Categoria, pk=categoria_id)
        producto_id = request.POST.get('producto_id')
        if producto_id:
            producto = get_object_or_404(Producto, pk=producto_id)
            # Migrar id_categoria existente a categorias si existe y no está ya en categorias
            if producto.id_categoria and producto.id_categoria not in producto.categorias.all():
                producto.categorias.add(producto.id_categoria)
            # Agregar a la relación many-to-many (no sobrescribe otras categorías)
            producto.categorias.add(categoria)
            # Mantener compatibilidad: si no tiene categoría principal, asignarla
            if not producto.id_categoria:
                producto.id_categoria = categoria
            producto.save()
            
            # Verificar si es una petición AJAX
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                # Obtener el código del producto
                codigo_producto = producto.codigo_set.first()
                producto_data = {
                    'id': producto.id_producto,
                    'nombre': producto.nombre or 'Sin nombre',
                    'marca': producto.marca or 'Sin marca',
                    'codigo': codigo_producto.codigo if codigo_producto else 'Sin código',
                    'stock': producto.stock_actual,
                    'precio': float(producto.precio_unitario)
                }
                print(f"DEBUG: Enviando datos del producto: {producto_data}")
                return JsonResponse({
                    'success': True,
                    'message': f'Producto <strong>{producto.nombre}</strong> agregado a la categoría <strong>{categoria.nombre}</strong>.',
                    'producto': producto_data
                })
            else:
                messages.success(request, f"Producto {producto.nombre} agregado a la categoría {categoria.nombre}.")
                return redirect('categoria_producto', categoria_id=categoria_id)
        else:
            # Verificar si es una petición AJAX
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': False,
                    'message': 'No se seleccionó ningún producto.'
                })
            else:
                messages.error(request, "No se seleccionó ningún producto.")
                return redirect('categoria_producto', categoria_id=categoria_id)
    
    # Si no es POST, redirigir
    return redirect('categoria_producto', categoria_id=categoria_id)


def obtener_productos_disponibles_ajax(request, categoria_id):
    """Vista AJAX para obtener productos disponibles para agregar a una categoría"""
    if request.method == 'GET' and request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        try:
            categoria = get_object_or_404(Categoria, pk=categoria_id)
            productos_disponibles = Producto.objects.filter(id_categoria__isnull=True)
            
            # Convertir productos a formato JSON
            productos_data = []
            for producto in productos_disponibles:
                productos_data.append({
                    'id': producto.id_producto,
                    'nombre': producto.nombre or 'Sin nombre',
                    'marca': producto.marca or 'Sin marca'
                })
            
            return JsonResponse({
                'success': True,
                'productos': productos_data
            })
            
        except Exception as e:
            return JsonResponse({
                'success': False,
                'message': f'Error al obtener productos disponibles: {str(e)}'
            })
    
    return JsonResponse({
        'success': False,
        'message': 'Método no permitido.'
    })


def eliminar_producto_categoria(request, categoria_id, producto_id):
    if request.method == 'POST':
        try:
            producto = Producto.objects.get(id_producto=producto_id)
            categoria = get_object_or_404(Categoria, pk=categoria_id)
            # Remover de la relación many-to-many
            producto.categorias.remove(categoria)
            # Si era la categoría principal, limpiarla
            if producto.id_categoria_id == categoria_id:
                producto.id_categoria = None
            producto.save()
            
            # Obtener la lista actualizada de productos disponibles
            productos_disponibles = Producto.objects.filter(id_categoria__isnull=True)
            productos_data = []
            for prod in productos_disponibles:
                productos_data.append({
                    'id': prod.id_producto,
                    'nombre': prod.nombre or 'Sin nombre',
                    'marca': prod.marca or 'Sin marca'
                })
            
            # Verificar si es una petición AJAX
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': True,
                    'message': f'El producto <strong>{producto.nombre}</strong> fue eliminado de la categoría.',
                    'productos_disponibles': productos_data
                })
            else:
                messages.success(request, f"El producto {producto.nombre} fue eliminado de la categoría.")
                return redirect('categoria_producto', categoria_id=categoria_id)
                
        except Producto.DoesNotExist:
            # Verificar si es una petición AJAX
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': False,
                    'message': 'El producto no está en esta categoría o ya fue eliminado.'
                })
            else:
                messages.warning(request, "El producto no está en esta categoría o ya fue eliminado.")
                return redirect('categoria_producto', categoria_id=categoria_id)
    
    # Si no es POST, redirigir
    return redirect('categoria_producto', categoria_id=categoria_id)


def restaurar_producto_categoria(request, categoria_id, producto_id):
    if request.method == 'POST':
        try:
            categoria = get_object_or_404(Categoria, pk=categoria_id)
            producto = get_object_or_404(Producto, pk=producto_id)
            
            # Verificar que el producto no esté ya en la categoría
            if categoria in producto.categorias.all() or producto.id_categoria == categoria:
                return JsonResponse({
                    'success': False,
                    'message': 'El producto ya está en esta categoría.'
                })
            
            # Restaurar el producto en la categoría (agregar a many-to-many)
            producto.categorias.add(categoria)
            # Si no tiene categoría principal, asignarla
            if not producto.id_categoria:
                producto.id_categoria = categoria
            producto.save()
            
            return JsonResponse({
                'success': True,
                'message': 'Producto restaurado correctamente.'
            })
            
        except (Categoria.DoesNotExist, Producto.DoesNotExist):
            return JsonResponse({
                'success': False,
                'message': 'La categoría o el producto no existe.'
            })
        except Exception as e:
            return JsonResponse({
                'success': False,
                'message': f'Error al restaurar el producto: {str(e)}'
            })
    
    return JsonResponse({
        'success': False,
        'message': 'Método no permitido.'
    })


def obtener_productos_categoria_ajax(request, categoria_id):
    """Vista AJAX para obtener productos de una categoría en formato JSON"""
    if request.method == 'GET' and request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        try:
            categoria = get_object_or_404(Categoria, pk=categoria_id)
            productos = Producto.objects.filter(id_categoria=categoria)
            
            # Convertir productos a formato JSON
            productos_data = []
            for producto in productos:
                productos_data.append({
                    'id': producto.id_producto,
                    'nombre': producto.nombre or 'Sin nombre',
                    'marca': producto.marca or 'Sin marca',
                    'stock': producto.stock_actual,
                    'precio': float(producto.precio_unitario),
                    'categoria_id': categoria_id
                })
            
            return JsonResponse({
                'success': True,
                'productos': productos_data,
                'categoria_nombre': categoria.nombre
            })
            
        except Exception as e:
            return JsonResponse({
                'success': False,
                'message': f'Error al obtener productos: {str(e)}'
            })
    
    return JsonResponse({
        'success': False,
        'message': 'Método no permitido.'
    })


def obtener_detalles_categoria(request, categoria_id):
    """Obtener todos los detalles de una categoría"""
    try:
        categoria = get_object_or_404(Categoria, pk=categoria_id)
        
        return JsonResponse({
            'success': True,
            'categoria': {
                'id': categoria.id_categoria,
                'nombre': categoria.nombre or 'Sin nombre',
                'descripcion': categoria.descripcion or ''
            }
        })
    except Categoria.DoesNotExist:
        return JsonResponse({
            'success': False,
            'message': 'Categoría no encontrada'
        })

def autocomplete_productos(request):
    from home.models import Producto
    from django.db.models import Q
    query = request.GET.get('q', '').strip()
    categoria_id = request.GET.get('categoria_id')

    # Si no hay query, mostrar todos los productos disponibles para la categoría
    if not query:
        productos = Producto.objects.all().select_related('id_categoria')
        
        # Excluir productos que ya están asociados a la categoría
        if categoria_id:
            productos = productos.exclude(id_categoria=categoria_id)
        
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

    # Buscar coincidencia exacta por nombre o código
    producto_exacto = Producto.objects.filter(
        Q(nombre__iexact=query) |
        Q(codigo__codigo__iexact=query)
    ).first()

    if producto_exacto:
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

    # Excluir productos que ya están asociados a la categoría
    if categoria_id:
        productos = productos.exclude(id_categoria=categoria_id)

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


