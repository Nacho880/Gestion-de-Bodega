from django.shortcuts import render
from django.db.models import Sum, F, FloatField, Count, Q, Case, When, IntegerField, DecimalField
from django.http import JsonResponse
from home.models import Venta, Compra, DetalleVenta, DetalleCompra, Producto, Categoria, Proveedore
from datetime import datetime, date, timedelta
from django.utils import timezone
from django.utils.timezone import localdate, make_aware, get_current_timezone
from decimal import Decimal

def estadisticas(request):
    nombre_usuario = request.session.get('usuario_nombre', 'Invitado')
    fecha_actual = localdate()
    tz = get_current_timezone()

    # Parsear filtros de fecha
    top = request.GET.get('top', 10)
    try:
        top = int(top)
        if top < 1:
            top = 10
    except ValueError:
        top = 10

    fecha_inicio_str = request.GET.get('fecha_inicio')
    fecha_fin_str = request.GET.get('fecha_fin')
    
    def parse_fecha(fecha_str):
        try:
            return datetime.strptime(fecha_str, '%Y-%m-%d').date()
        except:
            return None

    fecha_inicio = parse_fecha(fecha_inicio_str)
    fecha_fin = parse_fecha(fecha_fin_str)

    # Determinar período actual
    periodo_actual = 'historico'
    if fecha_inicio and fecha_fin:
        if fecha_inicio == fecha_fin:
            if fecha_inicio == fecha_actual:
                periodo_actual = 'hoy'
        elif fecha_inicio == fecha_actual - timedelta(days=1):
            periodo_actual = 'ayer'
        else:
            weekday_js = (fecha_actual.weekday() + 1) % 7
            inicio_semana = fecha_actual - timedelta(days=weekday_js)
            inicio_mes = fecha_actual.replace(day=1)
            if fecha_actual.month == 1:
                inicio_mes_anterior = fecha_actual.replace(year=fecha_actual.year-1, month=12, day=1)
                fin_mes_anterior = fecha_actual.replace(year=fecha_actual.year-1, month=12, day=31)
            else:
                inicio_mes_anterior = fecha_actual.replace(month=fecha_actual.month-1, day=1)
                fin_mes_anterior = fecha_actual.replace(month=fecha_actual.month, day=1) - timedelta(days=1)
            inicio_año = fecha_actual.replace(month=1, day=1)
            
            if fecha_inicio == inicio_semana and fecha_fin == fecha_actual:
                periodo_actual = 'semana'
            elif fecha_inicio == inicio_mes and fecha_fin == fecha_actual:
                periodo_actual = 'mes'
            elif fecha_inicio == inicio_mes_anterior and fecha_fin == fin_mes_anterior:
                periodo_actual = 'mes_anterior'
            elif fecha_inicio == inicio_año and fecha_fin == fecha_actual:
                periodo_actual = 'año'

    if fecha_inicio and fecha_fin and fecha_inicio > fecha_fin:
        fecha_inicio, fecha_fin = fecha_fin, fecha_inicio
        advertencia_fecha = True
    else:
        advertencia_fecha = False
    
    # Filtros para movimientos
    filtro_ventas = {'cantidad__gt': 0, 'venta__eliminado': False}
    filtro_compras = {'compra__eliminado': False}
    
    if fecha_inicio and fecha_fin:
        dt_inicio = make_aware(datetime.combine(fecha_inicio, datetime.min.time()), tz)
        dt_fin = make_aware(datetime.combine(fecha_fin, datetime.max.time()), tz)
        filtro_ventas.update({'venta__fecha__gte': dt_inicio, 'venta__fecha__lte': dt_fin})
        filtro_compras.update({'compra__fecha__gte': dt_inicio, 'compra__fecha__lte': dt_fin})
    
    # ========== MÉTRICAS DE INVENTARIO ==========
    
    # Valor total del inventario
    productos_activos = Producto.objects.filter(eliminado=False)
    valor_total_inventario = sum(
        p.stock_actual * p.precio_unitario 
        for p in productos_activos 
        if p.stock_actual and p.precio_unitario
    )
    
    # Productos con stock bajo (stock_actual <= stock_minimo)
    productos_stock_bajo = productos_activos.filter(
        Q(stock_minimo__isnull=False) & 
        Q(stock_actual__lte=F('stock_minimo')) & 
        Q(stock_actual__gt=0)
    ).count()
    
    # Productos sin stock
    productos_sin_stock = productos_activos.filter(
        Q(stock_actual__isnull=True) | Q(stock_actual__lte=0)
    ).count()
    
    # Total de productos, categorías y proveedores
    total_productos = productos_activos.count()
    total_categorias = Categoria.objects.filter(eliminado=False).count()
    total_proveedores = Proveedore.objects.filter(eliminado=False).count()
    
    # Lista de productos con stock bajo (para alertas)
    productos_stock_bajo_lista = productos_activos.filter(
        Q(stock_minimo__isnull=False) & 
        Q(stock_actual__lte=F('stock_minimo')) & 
        Q(stock_actual__gt=0)
    ).order_by('stock_actual')[:10]
    
    # Lista de productos sin stock
    productos_sin_stock_lista = productos_activos.filter(
        Q(stock_actual__isnull=True) | Q(stock_actual__lte=0)
    )[:10]
    
    # ========== ANÁLISIS DE MOVIMIENTO ==========
    
    # Totales de entradas y salidas
    totales_ventas = DetalleVenta.objects.filter(**filtro_ventas).aggregate(
        total_cant=Sum('cantidad'),
        total_monto=Sum(F('cantidad') * F('precio_unitario'), output_field=FloatField())
    )
    
    totales_compras = DetalleCompra.objects.filter(**filtro_compras).aggregate(
        total_cant=Sum('cantidad'),
        total_monto=Sum(F('cantidad') * F('precio_compra'), output_field=FloatField())
    )
    
    # Productos más salidos
    productos_vendidos = (
        DetalleVenta.objects.filter(**filtro_ventas)
        .values('producto__nombre', 'producto__id_producto')
        .annotate(
            total_vendido=Sum('cantidad'),
            monto_generado=Sum(F('cantidad') * F('precio_unitario'), output_field=FloatField())
        )
        .filter(total_vendido__gt=0)
        .order_by('-total_vendido')[:top]
    )
    
    # Productos más ingresados
    productos_comprados = (
        DetalleCompra.objects.filter(**filtro_compras)
        .values('producto__nombre', 'producto__id_producto')
        .annotate(
            total_comprado=Sum('cantidad'),
            monto_gastado=Sum(F('cantidad') * F('precio_compra'), output_field=FloatField())
        )
        .order_by('-total_comprado')[:top]
    )
    
    # Productos sin movimiento (últimos 30 días)
    fecha_30_dias = fecha_actual - timedelta(days=30)
    dt_30_dias = make_aware(datetime.combine(fecha_30_dias, datetime.min.time()), tz)
    
    productos_con_movimiento = set(
        DetalleVenta.objects.filter(
            venta__fecha__gte=dt_30_dias,
            venta__eliminado=False,
            cantidad__gt=0
        ).values_list('producto_id', flat=True)
    ) | set(
        DetalleCompra.objects.filter(
            compra__fecha__gte=dt_30_dias,
            compra__eliminado=False
        ).values_list('producto_id', flat=True)
    )
    
    productos_sin_movimiento = productos_activos.exclude(
        id_producto__in=productos_con_movimiento
    )[:10]
    
    # ========== ANÁLISIS FINANCIERO ==========
    
    # Gasto por proveedor
    compras_por_proveedor = (
        DetalleCompra.objects.filter(**filtro_compras)
        .values('compra__proveedor__nombre')
        .annotate(
        total_cant=Sum('cantidad'),
        total_monto=Sum(F('cantidad') * F('precio_compra'), output_field=FloatField())
    )
        .order_by('-total_monto')[:top]
    )
    
    # ========== ANÁLISIS POR CATEGORÍAS ==========
    
    categorias_vendidas = (
        DetalleVenta.objects.filter(**filtro_ventas)
        .values('producto__id_categoria__nombre')
        .annotate(
            total_vendido=Sum('cantidad'),
            monto_generado=Sum(F('cantidad') * F('precio_unitario'), output_field=FloatField())
        )
        .filter(total_vendido__gt=0)
        .order_by('-total_vendido')[:top]
    )

    categorias_compradas = (
        DetalleCompra.objects.filter(**filtro_compras)
        .values('producto__id_categoria__nombre')
        .annotate(
            total_comprado=Sum('cantidad'),
            monto_gastado=Sum(F('cantidad') * F('precio_compra'), output_field=FloatField())
        )
        .order_by('-total_comprado')[:top]
    )
    
    # ========== TENDENCIAS TEMPORALES ==========

    # Ventas por día
    ventas_por_dia = (
        DetalleVenta.objects.filter(**filtro_ventas)
        .values('venta__fecha__date')
        .annotate(
            total_cant=Sum('cantidad'),
            total_monto=Sum(F('cantidad') * F('precio_unitario'), output_field=FloatField())
        )
        .filter(total_cant__gt=0)
        .order_by('venta__fecha__date')
    )

    # Compras por día
    compras_por_dia = (
        DetalleCompra.objects.filter(**filtro_compras)
        .values('compra__fecha__date')
        .annotate(
            total_cant=Sum('cantidad'),
            total_monto=Sum(F('cantidad') * F('precio_compra'), output_field=FloatField())
        )
        .order_by('compra__fecha__date')
    )

    # ========== TOP PRODUCTOS ==========
    
    # Convertir a lista antes de usar .first() y .last() para evitar el error de reverse
    productos_vendidos_lista = list(productos_vendidos)
    productos_comprados_lista = list(productos_comprados)
    
    producto_mas_vendido = productos_vendidos_lista[0] if productos_vendidos_lista else None
    producto_menos_vendido = productos_vendidos_lista[-1] if productos_vendidos_lista else None
    
    producto_mas_comprado = productos_comprados_lista[0] if productos_comprados_lista else None
    producto_menos_comprado = productos_comprados_lista[-1] if productos_comprados_lista else None
    
    # Redondear precios
    def redondear_precios(lista, campos):
        for item in lista:
            for campo in campos:
                if campo in item and item[campo] is not None:
                    item[campo] = int(round(item[campo]))
        return lista
    
    productos_vendidos = redondear_precios(productos_vendidos_lista, ['monto_generado'])
    productos_comprados = redondear_precios(productos_comprados_lista, ['monto_gastado'])
    compras_por_proveedor = redondear_precios(list(compras_por_proveedor), ['total_monto'])
    categorias_vendidas = redondear_precios(list(categorias_vendidas), ['monto_generado'])
    categorias_compradas = redondear_precios(list(categorias_compradas), ['monto_gastado'])

    context = {
        # Métricas de inventario
        'valor_total_inventario': int(valor_total_inventario),
        'productos_stock_bajo': productos_stock_bajo,
        'productos_sin_stock': productos_sin_stock,
        'total_productos': total_productos,
        'total_categorias': total_categorias,
        'total_proveedores': total_proveedores,
        'productos_stock_bajo_lista': productos_stock_bajo_lista,
        'productos_sin_stock_lista': productos_sin_stock_lista,
        'productos_sin_movimiento': productos_sin_movimiento,
        
        # Análisis de movimiento
        'totales_ventas': totales_ventas,
        'totales_compras': totales_compras,
        'productos_vendidos': productos_vendidos,
        'productos_comprados': productos_comprados,
        'producto_mas_vendido': producto_mas_vendido,
        'producto_menos_vendido': producto_menos_vendido,
        'producto_mas_comprado': producto_mas_comprado,
        'producto_menos_comprado': producto_menos_comprado,
        
        # Análisis financiero
        'compras_por_proveedor': compras_por_proveedor,
        
        # Análisis por categorías
        'categorias_vendidas': categorias_vendidas,
        'categorias_compradas': categorias_compradas,
        
        # Tendencias temporales
        'ventas_por_dia': list(ventas_por_dia),
        'compras_por_dia': list(compras_por_dia),
        
        # Filtros
        'fecha_inicio': fecha_inicio_str or '',
        'fecha_fin': fecha_fin_str or '',
        'top': top,
        'advertencia_fecha': advertencia_fecha,
        'nombre_usuario': nombre_usuario,
        'periodo_actual': periodo_actual,
        'fecha_actual': fecha_actual.strftime('%Y-%m-%d'),
    }

    return render(request, 'estadistica/estadisticas.html', context)
