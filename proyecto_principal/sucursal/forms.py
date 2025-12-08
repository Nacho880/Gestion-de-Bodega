from django import forms
from home.models import Sucursal

class SucursalForm(forms.ModelForm):
    class Meta:
        model = Sucursal
        fields = [
            'nombre',
            'tipo',
            'correo',
            'prefijo_telefono',
            'telefono',
            'direccion',
            'pais',
            'ciudad',
            'comuna'
        ]
        widgets = {
            'tipo': forms.Select(attrs={
                'class': 'form-control rounded px-3',
            }),
            'prefijo_telefono': forms.TextInput(attrs={
                'class': 'form-control rounded-pill px-3',
                'placeholder': '+56'
            }),
            'telefono': forms.TextInput(attrs={
                'class': 'form-control rounded-pill px-3',
                'placeholder': '912345678'
            })
        }

