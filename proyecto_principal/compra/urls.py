from django.urls import path
from . import views
from .views import eliminar_historial_compras

urlpatterns = [
    path('', views.compras, name='compras'),
    path('carrito/agregar/', views.agregar_a_carrito, name='agregar_a_carrito_compra'),
    path('carrito/eliminar/<int:producto_id>/', views.eliminar_de_carrito, name='eliminar_de_carrito_compra'),
    path('carrito/editar/<int:producto_id>/', views.editar_carrito, name='editar_carrito_compra'),
    path('carrito/finalizar/', views.finalizar_compra, name='finalizar_compra'),
    path('editar/<int:id>/', views.editar_compra, name='editar_compra'),
    path('eliminar/<int:id>/', views.eliminar_compra, name='eliminar_compra'),
    path('restaurar/<int:id>/', views.restaurar_compra, name='restaurar_compra'),
    path('validar_producto/', views.validar_producto, name='validar_producto_compra'),
    path('editar_ajax/<int:id>/', views.editar_compra_ajax, name='editar_compra_ajax'),
    path('autocomplete_productos/', views.autocomplete_productos, name='autocomplete_productos_compra'),
    path('autocomplete_proveedores/', views.autocomplete_proveedores, name='autocomplete_proveedores_compra'),
    path('estado/<int:id_compra>/', views.obtener_estado_compra, name='obtener_estado_compra'),
    path('confirmar-entrega/<int:id>/', views.confirmar_entrega, name='confirmar_entrega'),
    path('validar_codigo/', views.validar_codigo, name='validar_codigo_compra'),
    path('verificar_compatibilidad/', views.verificar_compatibilidad, name='verificar_compatibilidad'),
    path('eliminar-historial/', eliminar_historial_compras, name='eliminar_historial_compras'),
] 