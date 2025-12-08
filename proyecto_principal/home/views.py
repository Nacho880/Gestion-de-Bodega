from django.shortcuts import render
from .models import Producto, Compra, Venta, DetalleVenta, DetalleCompra
from operator import attrgetter
from django.db import models
from datetime import datetime, timedelta

def main(request):
    productos = Producto.objects.select_related('id_categoria').all()
    nombre_usuario = request.session.get('usuario_nombre', 'Invitado')

    # Obtener compras con sus detalles
    compras = Compra.objects.prefetch_related('detalles__producto').all()
    ventas = Venta.objects.all()

    movimientos = []

    # Procesar compras con la nueva estructura
    for compra in compras:
        for detalle in compra.detalles.all():
            mov = type('Mov', (), {})()
            mov.tipo = 'C'  # Compra
            mov.precio_unitario = detalle.precio_compra
            mov.nombre_producto = detalle.producto.nombre
            mov.cantidad = detalle.cantidad
            mov.fecha = compra.fecha
            movimientos.append(mov)

    # Procesar ventas
    for v in ventas:
        for detalle in v.detalles.select_related('producto').all():
            # Excluir ventas con cantidad 0 (reembolsadas)
            if detalle.cantidad > 0:
                mov = type('Mov', (), {})()
                mov.tipo = 'V'
                mov.precio_unitario = detalle.precio_unitario
                mov.nombre_producto = detalle.producto.nombre
                mov.cantidad = detalle.cantidad
                mov.fecha = v.fecha
                movimientos.append(mov)

    # Ordenar todos los movimientos por fecha (más recientes primero)
    movimientos.sort(key=attrgetter('fecha'), reverse=True)
    # Limitar a los últimos 10 movimientos
    movimientos = movimientos[:10]

    # Productos sin stock (stock_actual <= 0)
    productos_sin_stock = Producto.objects.filter(
        models.Q(stock_actual__isnull=True) | models.Q(stock_actual__lte=0)
    )
    
    # Productos con poco stock (stock_actual <= stock_minimo y stock_actual > 0)
    productos_poco_stock = Producto.objects.filter(
        stock_minimo__isnull=False,
        stock_actual__lte=models.F('stock_minimo'),
        stock_actual__gt=0
    )
    
    # Productos con stock bajo (solo poco stock, EXCLUYENDO sin stock)
    # Los productos sin stock (stock = 0) solo se cuentan como agotados
    from django.db.models import Q
    productos_bajo_stock = Producto.objects.filter(
        stock_minimo__isnull=False,
        stock_actual__lte=models.F('stock_minimo'),
        stock_actual__gt=0  # Excluir productos con stock = 0
    )
    
    # Productos agotados (stock = 0)
    productos_agotados = Producto.objects.filter(stock_actual=0).count()

    return render(request, 'home/main.html', {
        'productos': productos,
        'nombre_usuario': nombre_usuario,
        'movimientos': movimientos,
        'productos_bajo_stock': productos_bajo_stock,
        'productos_sin_stock': productos_sin_stock,
        'productos_poco_stock': productos_poco_stock,
        'productos_agotados': productos_agotados,
    })

