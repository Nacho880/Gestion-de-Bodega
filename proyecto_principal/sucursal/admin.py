from django.contrib import admin
from home.models import Sucursal

@admin.register(Sucursal)
class SucursalAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'tipo', 'ciudad', 'comuna', 'telefono_completo', 'eliminado')
    list_filter = ('tipo', 'pais', 'ciudad', 'comuna', 'eliminado')
    search_fields = ('nombre', 'direccion', 'telefono', 'correo', 'ciudad', 'comuna')
    list_editable = ('eliminado',)
