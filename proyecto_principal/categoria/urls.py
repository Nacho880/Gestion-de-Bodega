from django.urls import path
from . import views

urlpatterns = [
    path('', views.categorias, name='categorias'),  # lista categorías en /categoria/
    
    path('agregar/', views.agregar_categoria, name='agregar_categoria'),
    path('editar/<int:id>/', views.editar_categoria, name='editar_categoria'),
    path('eliminar/<int:id>/', views.eliminar_categoria, name='eliminar_categoria'),
    path('restaurar/<int:id>/', views.restaurar_categoria, name='restaurar_categoria'),

    path('<int:categoria_id>/productos/', views.categoria_producto, name='categoria_producto'),
    path('<int:categoria_id>/productos/agregar/', views.agregar_producto_categoria, name='agregar_producto_categoria'),
    path('<int:categoria_id>/productos/eliminar/<int:producto_id>/', views.eliminar_producto_categoria, name='eliminar_producto_categoria'),
    path('<int:categoria_id>/restaurar_producto/<int:producto_id>/', views.restaurar_producto_categoria, name='restaurar_producto_categoria'),
    path('<int:categoria_id>/productos/ajax/', views.obtener_productos_categoria_ajax, name='obtener_productos_categoria_ajax'),
    path('<int:categoria_id>/productos/disponibles/', views.obtener_productos_disponibles_ajax, name='obtener_productos_disponibles_ajax'),
    path('autocomplete_productos/', views.autocomplete_productos, name='autocomplete_productos_categoria'),
    path('validar_codigo/', views.validar_codigo, name='validar_codigo_categoria'),
    path('<int:categoria_id>/detalles/', views.obtener_detalles_categoria, name='obtener_detalles_categoria'),
]
