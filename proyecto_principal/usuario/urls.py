from django.urls import path
from . import views

urlpatterns = [
    path('', views.login, name='login'),
    path('logout/', views.logout_view, name='logout'),#logout es para llamar esa view en el html
    path('verificacion/', views.verificacion, name='verificacion'),
    path('verificar/', views.verificar, name='verificar'),
    path('recuperar/', views.recuperar, name='recuperar'),
    path('crear-primer-usuario/', views.crear_primer_usuario, name='crear_primer_usuario'),
    path('verificar-primer-usuario/', views.verificar_primer_usuario, name='verificar_primer_usuario'),
    
    # Rutas para el módulo de perfiles
    path('perfiles/', views.lista_perfiles, name='lista_perfiles'),
    path('perfiles/nuevo/', views.nuevo_perfil, name='nuevo_perfil'),
    path('perfiles/verificar/', views.verificar_nuevo_perfil, name='verificar_nuevo_perfil'),
    path('perfiles/editar/<int:id_usuario>/ajax/', views.editar_perfil_ajax, name='editar_perfil_ajax'),
    path('perfiles/verificar-editar/', views.verificar_editar_perfil, name='verificar_editar_perfil'),
    path('perfiles/eliminar/<int:id_usuario>/', views.eliminar_perfil, name='eliminar_perfil'),
    path('perfiles/restaurar/<int:id_usuario>/', views.restaurar_perfil, name='restaurar_perfil'),

]
