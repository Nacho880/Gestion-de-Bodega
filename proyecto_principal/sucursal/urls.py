from django.urls import path
from . import views

urlpatterns = [
    path('', views.sucursales, name='sucursales'),  # lista sucursales en /sucursal/
    path('agregar/', views.agregar_sucursal, name='agregar_sucursal'),
    path('editar/<int:id>/', views.editar_sucursal, name='editar_sucursal'),
    path('eliminar/<int:id>/', views.eliminar_sucursal, name='eliminar_sucursal'),
    path('restaurar/<int:id>/', views.restaurar_sucursal, name='restaurar_sucursal'),
    path('<int:sucursal_id>/detalles/', views.obtener_detalles_sucursal, name='obtener_detalles_sucursal'),
]

