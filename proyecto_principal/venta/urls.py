from django.urls import path
from . import views
from .views import eliminar_historial_ventas

urlpatterns = [
    path('', views.ventas, name='ventas'),
    path('carrito/agregar/', views.agregar_a_carrito, name='agregar_a_carrito'),
    path('carrito/eliminar/<int:producto_id>/', views.eliminar_de_carrito, name='eliminar_de_carrito'),
    path('carrito/editar/<int:producto_id>/', views.editar_carrito, name='editar_carrito'),
    path('carrito/editar-precio/<int:producto_id>/', views.editar_carrito_precio, name='editar_carrito_precio'),
    path('carrito/finalizar/', views.finalizar_venta, name='finalizar_venta'),
    path('editar/<int:id>/', views.editar_venta, name='editar_venta'),
    path('eliminar/<int:id>/', views.eliminar_venta, name='eliminar_venta'),
    path('restaurar/<int:id>/', views.restaurar_venta, name='restaurar_venta'),
    path('validar_producto/', views.validar_producto, name='validar_producto'),
    path('validar_codigo/', views.validar_codigo, name='validar_codigo'),
    path('editar_ajax/<int:id>/', views.editar_venta_ajax, name='editar_venta_ajax'),
    path('autocomplete_productos/', views.autocomplete_productos, name='autocomplete_productos'),
    path('autocomplete_sucursales/', views.autocomplete_sucursales, name='autocomplete_sucursales'),
    path('estado/<int:id_venta>/', views.obtener_estado_venta, name='obtener_estado_venta'),
    path('confirmar-entrega/<int:id>/', views.confirmar_entrega, name='confirmar_entrega_venta'),
    path('boleta/<int:id_venta>/', views.boleta_venta, name='boleta_venta'),
    path('eliminar-historial/', eliminar_historial_ventas, name='eliminar_historial_ventas'),
]