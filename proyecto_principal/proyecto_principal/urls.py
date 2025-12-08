from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),

    # rutas de la aplicación usuario (en la raíz)
    path('', include('usuario.urls')),

    # rutas de la app home
    path('inicio/', include('home.urls')),

    # rutas de la app categoria
    path('categoria/', include('categoria.urls')),

    # rutas de la app proveedor
    path('proveedor/', include('proveedor.urls')),

    # rutas de la app sucursal
    path('sucursal/', include('sucursal.urls')),

    # rutas de la app producto
    path('producto/', include('producto.urls')),

    # rutas de la app salidas
    path('salidas/', include('venta.urls')),
    
    # rutas de la app entradas
    path('entradas/', include('compra.urls')),
    
    path('estadistica/', include('estadistica.urls')),
]
