from django import forms
from home.models import Proveedore

class ProveedoreForm(forms.ModelForm):
    class Meta:
        model = Proveedore
        fields = [
            'nombre',
            'correo',
            'prefijo_telefono',
            'telefono',
            'direccion',
            'pais',
            'ciudad',
            'comuna'
        ]
        widgets = {
            'prefijo_telefono': forms.TextInput(attrs={
                'class': 'form-control rounded-pill px-3',
                'placeholder': '+56'
            }),
            'telefono': forms.TextInput(attrs={
                'class': 'form-control rounded-pill px-3',
                'placeholder': '912345678'
            })
        } 