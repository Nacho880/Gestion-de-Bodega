from django.shortcuts import render, redirect, get_object_or_404
from django.db import models
from django.db.models import Case, When, IntegerField, Q, Exists, OuterRef
from home.models import Producto, Codigo, Categoria
from .forms import ProductoForm
from django.utils import timezone
from django.contrib import messages
from django.http import JsonResponse
from django.views.decorators.http import require_GET, require_POST
from django.core.paginator import Paginator

def productos(request):
    nombre_usuario = request.session.get('usuario_nombre', 'Invitado')
    categorias = Categoria.objects.all()
    
    # Obtener parámetros de búsqueda y ordenamiento
    search_query = request.GET.get('search', '').strip()
    sort_field = request.GET.get('sort', 'estado')
    # Para estado, cuando es el ordenamiento por defecto (sin parámetros), mostrar primero sin stock
    # La flecha debe apuntar hacia abajo (desc) para indicar que muestra primero los valores bajos
    has_sort_param = 'sort' in request.GET
    if sort_field == 'estado' and not has_sort_param:
        # Ordenamiento por defecto: mostrar primero sin stock (valores bajos)
        # Usar 'desc' para que la flecha apunte hacia abajo
        order = 'desc'
    else:
        order = request.GET.get('order', 'asc')
    per_page = int(request.GET.get('per_page', 10))
    
    # Obtener parámetros de filtro (pueden ser múltiples)
    filter_marcas = request.GET.getlist('filter_marca')
    filter_categorias = request.GET.getlist('filter_categoria')
    filter_estados = request.GET.getlist('filter_estado')
    
    # Obtener todos los productos con sus categorías (prefetch para optimizar)
    productos = Producto.objects.prefetch_related('categorias', 'id_categoria').all()
    
    # Anotar con el estado del stock para ordenamiento
    # Prioridad: 1 = Sin stock, 2 = Poco stock, 3 = En stock
    productos = productos.annotate(
        estado_stock_orden=Case(
            # Sin stock: stock_actual es None o <= 0
            When(
                Q(stock_actual__isnull=True) | Q(stock_actual__lte=0),
                then=1
            ),
            # Poco stock: stock_actual <= stock_minimo (y stock_minimo no es None)
            When(
                Q(stock_minimo__isnull=False) & Q(stock_actual__lte=models.F('stock_minimo')) & Q(stock_actual__gt=0),
                then=2
            ),
            # En stock: stock_actual > stock_minimo o stock_minimo es None
            default=3,
            output_field=IntegerField()
        )
    )
    
    # Anotar si el producto tiene ventas o compras asociadas (para saber si se puede eliminar)
    from home.models import DetalleVenta, DetalleCompra
    productos = productos.annotate(
        tiene_ventas=Exists(DetalleVenta.objects.filter(producto=OuterRef('pk'))),
        tiene_compras=Exists(DetalleCompra.objects.filter(producto=OuterRef('pk')))
    )
    
    # Aplicar filtro por marca(s)
    if filter_marcas:
        productos = productos.filter(marca__in=filter_marcas)
    
    # Aplicar filtro por categoría(s)
    if filter_categorias:
        try:
            categoria_ids = [int(cat_id) for cat_id in filter_categorias]
            productos = productos.filter(
                Q(categorias__id_categoria__in=categoria_ids) | Q(id_categoria__id_categoria__in=categoria_ids)
            ).distinct()
        except ValueError:
            pass
    
    # Aplicar filtro por estado(s)
    if filter_estados:
        try:
            # Mapear los estados a sus valores numéricos
            estado_map = {
                'sin_stock': 1,
                'poco_stock': 2,
                'en_stock': 3
            }
            estado_values = [estado_map[estado] for estado in filter_estados if estado in estado_map]
            if estado_values:
                productos = productos.filter(estado_stock_orden__in=estado_values)
        except (ValueError, KeyError):
            pass
    
    # Aplicar búsqueda
    if search_query:
        # Buscar códigos relacionados y obtener los IDs de productos
        codigos_productos_ids = list(Codigo.objects.filter(
            codigo__icontains=search_query
        ).values_list('id_producto_id', flat=True))
        
        # Construir la consulta de búsqueda
        search_filters = Q(nombre__icontains=search_query) | Q(marca__icontains=search_query) | Q(descripcion__icontains=search_query)
        
        # Si hay códigos encontrados, agregar filtro por IDs de productos
        if codigos_productos_ids:
            search_filters |= Q(id_producto__in=codigos_productos_ids)
        
        productos = productos.filter(search_filters).distinct()
    
    # Aplicar ordenamiento
    sort_fields_map = {
        'nombre': 'nombre',
        'marca': 'marca',
        'precio': 'precio_unitario',
        'stock': 'stock_actual',
        'categoria': 'id_categoria__nombre',
        'estado': 'estado_stock_orden',
    }
    
    if sort_field in sort_fields_map:
        sort_key = sort_fields_map[sort_field]
        # Para columnas numéricas (precio y stock), invertir el ordenamiento
        # para que la flecha hacia arriba muestre los valores más altos primero
        if sort_field in ['precio', 'stock']:
            # Si piden 'asc', ordenar descendente (valores altos primero)
            # Si piden 'desc', ordenar ascendente (valores bajos primero)
            if order == 'asc':
                sort_key = f'-{sort_key}'
        elif sort_field == 'estado':
            # Para estado: 
            # - Si es el ordenamiento por defecto (desc): ordenar ascendente (sin stock primero)
            # - Si el usuario hace clic en flecha arriba (asc): ordenar descendente (en stock primero)
            # - Si el usuario hace clic en flecha abajo (desc): ordenar ascendente (sin stock primero)
            if has_sort_param and order == 'asc':
                # Usuario hizo clic en flecha arriba: mostrar en stock primero
                sort_key = f'-{sort_key}'
            # Si order == 'desc' (por defecto o usuario hizo clic), ordenar ascendente (sin stock primero)
        else:
            # Para otras columnas, comportamiento normal
            if order == 'desc':
                sort_key = f'-{sort_key}'
        productos = productos.order_by(sort_key)
    else:
        # Ordenamiento por defecto: solo por estado de stock (sin stock primero, luego poco stock, luego en stock)
        productos = productos.order_by('estado_stock_orden')
    
    # Paginación
    paginator = Paginator(productos, per_page)
    page_number = request.GET.get('page', 1)
    page_obj = paginator.get_page(page_number)
    
    # Obtener marcas únicas para el filtro (sin agrupar)
    marcas = list(Producto.objects.exclude(marca__isnull=True).exclude(marca='').values_list('marca', flat=True).distinct().order_by('marca'))
    
    # Si es una petición AJAX, devolver solo el contenido de la tabla
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return render(request, 'producto/partials/table_content.html', {
            'productos': page_obj,
            'page_obj': page_obj,
            'search_query': search_query,
            'sort_field': sort_field,
            'order': order,
            'categorias': categorias,
            'filter_marcas': filter_marcas,
            'filter_categorias': filter_categorias,
            'filter_estados': filter_estados,
        })
    
    return render(request, 'producto/productos.html', {
        'productos': page_obj,
        'page_obj': page_obj,
        'categorias': categorias,
        'marcas': marcas,
        'nombre_usuario': nombre_usuario,
        'search_query': search_query,
        'sort_field': sort_field,
        'order': order,
        'filter_marcas': filter_marcas,
        'filter_categorias': filter_categorias,
        'filter_estados': filter_estados,
    })

def agregar_producto(request):
    if request.method == 'POST':
        form = ProductoForm(request.POST)
        codigo = request.POST.get('codigo', '').strip()
        
        # Validar si el código ya existe (solo productos no eliminados)
        if codigo and Codigo.objects.filter(codigo=codigo, id_producto__eliminado=False).exists():
            return JsonResponse({
                'success': False,
                'message': f"El código SKU '{codigo}' ya existe. Por favor, use un código diferente.",
                'field': 'codigo'
            })
        
        if form.is_valid():
            producto = form.save()
            if codigo:
                Codigo.objects.create(id_producto=producto, codigo=codigo)
            
            # Manejar múltiples categorías
            categorias_ids = request.POST.getlist('categorias_ids')
            # También verificar si viene como string separado por comas
            if not categorias_ids:
                categorias_str = request.POST.get('categorias_ids', '').strip()
                if categorias_str:
                    categorias_ids = [id.strip() for id in categorias_str.split(',') if id.strip()]
            
            if categorias_ids:
                try:
                    categoria_ids = [int(cat_id) for cat_id in categorias_ids if cat_id and cat_id.strip()]
                    if categoria_ids:
                        categorias = Categoria.objects.filter(id_categoria__in=categoria_ids)
                        # Usar set() para asignar todas las categorías
                        producto.categorias.set(categorias)
                        # Si no tiene categoría principal, asignar la primera
                        if not producto.id_categoria and categorias.exists():
                            producto.id_categoria = categorias.first()
                            producto.save()
                except (ValueError, TypeError) as e:
                    # Log del error para debugging
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.error(f"Error al guardar categorías: {e}")
            
            return JsonResponse({
                'success': True,
                'message': f'Producto <strong>{producto.nombre}</strong> agregado.'
            })
        else:
            # Devolver errores del formulario
            errors = {}
            for field, error_list in form.errors.items():
                errors[field] = error_list[0]
            msg = 'Error al agregar el producto.'
            if 'precio_unitario' in errors and 'negativo' in errors['precio_unitario']:
                msg = errors['precio_unitario']
            return JsonResponse({
                'success': False,
                'message': msg,
                'errors': errors
            })
    
    return redirect('productos')

def editar_producto(request, id):
    producto = get_object_or_404(Producto, id_producto=id)
    if request.method == 'POST':
        form = ProductoForm(request.POST, instance=producto)
        codigo = request.POST.get('codigo', '').strip()
        
        # Validar si el código ya existe (excluyendo el código actual del producto)
        codigo_actual = producto.codigo_set.first()
        if codigo:
            if codigo_actual and codigo == codigo_actual.codigo:
                # Es el mismo código, no hay problema
                pass
            elif Codigo.objects.filter(codigo=codigo, id_producto__eliminado=False).exists():
                return JsonResponse({
                    'success': False,
                    'message': f"El código SKU '{codigo}' ya existe. Por favor, use un código diferente.",
                    'field': 'codigo'
                })
        
        if form.is_valid():
            # Guardar el producto primero
            producto = form.save()
            
            if codigo:
                Codigo.objects.filter(id_producto=producto).delete()
                Codigo.objects.create(id_producto=producto, codigo=codigo)
            
            # Manejar múltiples categorías
            categorias_ids = request.POST.getlist('categorias_ids')
            # También verificar si viene como string separado por comas
            if not categorias_ids:
                categorias_str = request.POST.get('categorias_ids', '').strip()
                if categorias_str:
                    categorias_ids = [id.strip() for id in categorias_str.split(',') if id.strip()]
            
            # Verificar si se envió explícitamente el parámetro (incluso si está vacío)
            # Si el parámetro existe en POST, actualizar las categorías
            if 'categorias_ids' in request.POST or request.POST.getlist('categorias_ids'):
                if categorias_ids:
                    try:
                        # Filtrar valores vacíos y convertir a enteros
                        categoria_ids = [int(cat_id) for cat_id in categorias_ids if cat_id and str(cat_id).strip()]
                        if categoria_ids:
                            categorias = Categoria.objects.filter(id_categoria__in=categoria_ids)
                            # Verificar que se encontraron todas las categorías
                            if categorias.count() > 0:
                                # Usar set() para reemplazar todas las categorías con las nuevas
                                # Esto permite múltiples categorías
                                producto.categorias.set(categorias)
                                # Si no tiene categoría principal, asignar la primera
                                if not producto.id_categoria and categorias.exists():
                                    producto.id_categoria = categorias.first()
                                    producto.save()
                    except (ValueError, TypeError) as e:
                        # Log del error para debugging
                        import logging
                        logger = logging.getLogger(__name__)
                        logger.error(f"Error al guardar categorías: {e}, categorias_ids recibidos: {categorias_ids}")
            else:
                    # Si se envió el parámetro pero está vacío, limpiar la relación
                producto.categorias.clear()
            # Si no se envió el parámetro, mantener las categorías existentes (no hacer nada)
            
            return JsonResponse({
                'success': True,
                'message': f'Producto <strong>{producto.nombre}</strong> editado.'
            })
        else:
            # Devolver errores del formulario
            errors = {}
            for field, error_list in form.errors.items():
                errors[field] = error_list[0]
            msg = 'Error al actualizar el producto.'
            if 'precio_unitario' in errors and 'negativo' in errors['precio_unitario']:
                msg = errors['precio_unitario']
            return JsonResponse({
                'success': False,
                'message': msg,
                'errors': errors
            })
    
    return redirect('productos')

@require_GET
def verificar_eliminar_producto(request, id):
    """Verifica si un producto se puede eliminar antes de mostrar el modal"""
    producto = get_object_or_404(Producto, id_producto=id)
    from home.models import DetalleVenta, DetalleCompra
    
    ventas_asociadas = DetalleVenta.objects.filter(producto=producto).exists()
    compras_asociadas = DetalleCompra.objects.filter(producto=producto).exists()
    
    if ventas_asociadas or compras_asociadas:
        return JsonResponse({
            'puede_eliminar': False,
            'message': 'No se puede eliminar el producto porque está asociado a alguna salida o entrada.'
        })
    
    return JsonResponse({
        'puede_eliminar': True
    })

def eliminar_producto(request, id):
    if request.method == 'POST':
        producto = get_object_or_404(Producto, id_producto=id)
        try:
            # Usar soft delete en lugar de eliminación permanente
            producto.soft_delete()
            return JsonResponse({
                'success': True,
                'message': f'El producto <strong>{producto.nombre}</strong> fue eliminado.',
                'producto_id': producto.id_producto
            })
        except ValueError as e:
            # Capturar el error específico de dependencias
            return JsonResponse({
                'success': False,
                'message': str(e)
            })
        except Exception as e:
            return JsonResponse({
                'success': False,
                'message': 'Error al eliminar el producto.'
            })
    
    return redirect('productos')

def restaurar_producto(request, id):
    if request.method == 'POST':
        producto = get_object_or_404(Producto.all_objects, id_producto=id, eliminado=True)
        try:
            producto.restore()
            return JsonResponse({
                'success': True,
                'message': 'Producto restaurado correctamente.'
            })
        except Exception as e:
            return JsonResponse({
                'success': False,
                'message': 'Error al restaurar el producto.'
            })
    
    return redirect('productos')

def validar_codigo(request):
    codigo = request.GET.get('codigo', '').strip()
    existe = Codigo.objects.filter(codigo=codigo, id_producto__eliminado=False).exists()
    return JsonResponse({'existe': existe})

@require_GET
def autocomplete_categorias(request):
    query = request.GET.get('q', '').strip()
    all_categories = request.GET.get('all', 'false').lower() == 'true'
    
    # Buscar categorías que coincidan con la consulta
    if query:
        categorias_filtradas = Categoria.objects.filter(
            nombre__icontains=query
        ).order_by('nombre')
        # Limitar a 10 resultados solo cuando hay búsqueda (autocompletado)
        if not all_categories:
            categorias_filtradas = categorias_filtradas[:10]
    else:
        # Si no hay query, mostrar todas las categorías
        categorias_filtradas = Categoria.objects.all().order_by('nombre')
        # No limitar cuando se solicitan todas las categorías
    
    results = []
    for categoria in categorias_filtradas:
        results.append({
            'id': categoria.id_categoria,
            'nombre': categoria.nombre,
            'descripcion': categoria.descripcion or ''
        })
    
    return JsonResponse({'results': results})

def obtener_categorias_producto(request, producto_id):
    """Obtener todas las categorías de un producto"""
    try:
        producto = get_object_or_404(Producto, pk=producto_id)
        categorias = []
        
        # Obtener categorías de la relación many-to-many
        for categoria in producto.categorias.all():
            categorias.append({
                'id': categoria.id_categoria,
                'nombre': categoria.nombre
            })
        
        # Si no hay categorías en many-to-many pero tiene id_categoria, incluirla
        if not categorias and producto.id_categoria:
            categorias.append({
                'id': producto.id_categoria.id_categoria,
                'nombre': producto.id_categoria.nombre
            })
        
        return JsonResponse({
            'success': True,
            'producto_nombre': producto.nombre,
            'categorias': categorias
        })
    except Producto.DoesNotExist:
        return JsonResponse({
            'success': False,
            'message': 'Producto no encontrado'
        })

def obtener_detalles_producto(request, producto_id):
    """Obtener todos los detalles de un producto"""
    try:
        producto = get_object_or_404(Producto.objects.prefetch_related('categorias', 'codigo_set'), pk=producto_id)
        categorias = []
        
        # Obtener categorías de la relación many-to-many
        for categoria in producto.categorias.all():
            categorias.append({
                'id': categoria.id_categoria,
                'nombre': categoria.nombre
            })
        
        # Si no hay categorías en many-to-many pero tiene id_categoria, incluirla
        if not categorias and producto.id_categoria:
            categorias.append({
                'id': producto.id_categoria.id_categoria,
                'nombre': producto.id_categoria.nombre
            })
        
        # Obtener código
        codigo = producto.codigo_set.first()
        codigo_str = codigo.codigo if codigo else 'Sin código'
        
        return JsonResponse({
            'success': True,
            'producto': {
                'id': producto.id_producto,
                'nombre': producto.nombre or 'Sin nombre',
                'marca': producto.marca or 'Sin marca',
                'descripcion': producto.descripcion or '',
                'precio_unitario': float(producto.precio_unitario),
                'stock_actual': producto.stock_actual,
                'estado_stock': producto.get_estado_stock(),
                'estado_stock_display': producto.get_estado_stock_display(),
                'stock_minimo': producto.stock_minimo if producto.stock_minimo is not None else None,
                'codigo': codigo_str,
                'categorias': categorias
            }
        })
    except Producto.DoesNotExist:
        return JsonResponse({
            'success': False,
            'message': 'Producto no encontrado'
        })
