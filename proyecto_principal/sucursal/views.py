from django.shortcuts import render, redirect, get_object_or_404
from home.models import Sucursal
from .forms import SucursalForm
from django.contrib import messages
from django.http import JsonResponse
from django.db.models import Q
from django.core.paginator import Paginator

def sucursales(request):
    nombre_usuario = request.session.get('usuario_nombre', 'Invitado')
    
    # Obtener parámetros de búsqueda y ordenamiento
    search_query = request.GET.get('search', '').strip()
    sort_field = request.GET.get('sort', 'nombre')
    order = request.GET.get('order', 'asc')
    per_page = int(request.GET.get('per_page', 10))
    
    # Obtener filtros
    filter_tipos = request.GET.getlist('filter_tipo')
    filter_paises = request.GET.getlist('filter_pais')
    filter_ciudades = request.GET.getlist('filter_ciudad')
    filter_comunas = request.GET.getlist('filter_comuna')
    
    # Obtener todas las sucursales
    sucursales = Sucursal.objects.all()
    
    # Aplicar filtros
    if filter_tipos:
        sucursales = sucursales.filter(tipo__in=filter_tipos)
    if filter_paises:
        sucursales = sucursales.filter(pais__in=filter_paises)
    if filter_ciudades:
        sucursales = sucursales.filter(ciudad__in=filter_ciudades)
    if filter_comunas:
        sucursales = sucursales.filter(comuna__in=filter_comunas)
    
    # Aplicar búsqueda
    if search_query:
        sucursales = sucursales.filter(
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
        'tipo': 'tipo',
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
        sucursales = sucursales.order_by(sort_key)
    else:
        sucursales = sucursales.order_by('nombre')
    
    # Obtener valores únicos para los filtros
    tipos = sorted(Sucursal.objects.values_list('tipo', flat=True).distinct().exclude(tipo__isnull=True).exclude(tipo=''))
    paises = sorted(Sucursal.objects.values_list('pais', flat=True).distinct().exclude(pais__isnull=True).exclude(pais=''))
    ciudades = sorted(Sucursal.objects.values_list('ciudad', flat=True).distinct().exclude(ciudad__isnull=True).exclude(ciudad=''))
    comunas = sorted(Sucursal.objects.values_list('comuna', flat=True).distinct().exclude(comuna__isnull=True).exclude(comuna=''))
    
    # Paginación
    paginator = Paginator(sucursales, per_page)
    page_number = request.GET.get('page', 1)
    page_obj = paginator.get_page(page_number)
    
    # Si es una petición AJAX, devolver solo el contenido de la tabla
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return render(request, 'sucursal/partials/table_content.html', {
            'sucursales': page_obj,
            'page_obj': page_obj,
            'search_query': search_query,
            'sort_field': sort_field,
            'order': order,
        })
    
    return render(request, 'sucursal/sucursales.html', {
        'sucursales': page_obj,
        'page_obj': page_obj,
        'nombre_usuario': nombre_usuario,
        'search_query': search_query,
        'sort_field': sort_field,
        'order': order,
        'tipos': tipos,
        'paises': paises,
        'ciudades': ciudades,
        'comunas': comunas,
        'filter_tipos': filter_tipos,
        'filter_paises': filter_paises,
        'filter_ciudades': filter_ciudades,
        'filter_comunas': filter_comunas,
    })

def obtener_detalles_sucursal(request, sucursal_id):
    """Obtener todos los detalles de una sucursal"""
    try:
        sucursal = get_object_or_404(Sucursal, pk=sucursal_id)
        
        return JsonResponse({
            'success': True,
            'sucursal': {
                'id': sucursal.id_sucursal,
                'nombre': sucursal.nombre or 'Sin nombre',
                'tipo': sucursal.get_tipo_display(),
                'telefono': sucursal.telefono_completo if sucursal.telefono else 'Sin teléfono',
                'correo': sucursal.correo or 'Sin correo',
                'direccion': sucursal.direccion or 'Sin dirección',
                'pais': sucursal.pais or 'Sin país',
                'ciudad': sucursal.ciudad or 'Sin ciudad',
                'comuna': sucursal.comuna or 'Sin comuna'
            }
        })
    except Sucursal.DoesNotExist:
        return JsonResponse({
            'success': False,
            'message': 'Sucursal no encontrada'
        })

def agregar_sucursal(request):
    if request.method == 'POST':
        form = SucursalForm(request.POST)
        if form.is_valid():
            sucursal = form.save()
            return JsonResponse({
                'success': True,
                'message': f'Sucursal <strong>{sucursal.nombre}</strong> agregada.'
            })
        else:
            errors = {}
            for field, error_list in form.errors.items():
                errors[field] = error_list[0]
            return JsonResponse({
                'success': False,
                'message': 'Error al agregar la sucursal.',
                'errors': errors
            })
    
    return JsonResponse({
        'success': False,
        'message': 'Método no permitido.'
    }, status=405)

def editar_sucursal(request, id):
    sucursal = get_object_or_404(Sucursal, pk=id)
    if request.method == 'POST':
        form = SucursalForm(request.POST, instance=sucursal)
        if form.is_valid():
            form.save()
            return JsonResponse({
                'success': True,
                'message': f'Sucursal <strong>{sucursal.nombre}</strong> editada.'
            })
        else:
            errors = {}
            for field, error_list in form.errors.items():
                errors[field] = error_list[0]
            return JsonResponse({
                'success': False,
                'message': 'Error al editar la sucursal.',
                'errors': errors
            })
    
    return JsonResponse({
        'success': False,
        'message': 'Método no permitido.'
    }, status=405)

def eliminar_sucursal(request, id):
    if request.method == 'POST':
        sucursal = get_object_or_404(Sucursal, id_sucursal=id)
        try:
            sucursal.soft_delete()
            return JsonResponse({
                'success': True,
                'message': f'La sucursal <strong>{sucursal.nombre}</strong> fue eliminada.',
                'sucursal_id': sucursal.id_sucursal
            })
        except ValueError as e:
            return JsonResponse({
                'success': False,
                'message': str(e)
            })
        except Exception as e:
            return JsonResponse({
                'success': False,
                'message': 'Error al eliminar la sucursal.'
            })
    
    return JsonResponse({
        'success': False,
        'message': 'Método no permitido.'
    }, status=405)

def restaurar_sucursal(request, id):
    if request.method == 'POST':
        sucursal = get_object_or_404(Sucursal.all_objects, id_sucursal=id, eliminado=True)
        try:
            sucursal.restore()
            return JsonResponse({
                'success': True,
                'message': 'Sucursal restaurada correctamente.'
            })
        except Exception as e:
            return JsonResponse({
                'success': False,
                'message': 'Error al restaurar la sucursal.'
            })
    
    return JsonResponse({
        'success': False,
        'message': 'Método no permitido.'
    }, status=405)
