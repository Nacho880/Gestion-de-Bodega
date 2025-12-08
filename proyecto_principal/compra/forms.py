from django import forms
from home.models import Compra, DetalleCompra, Proveedore, Producto

class CompraForm(forms.ModelForm):
    class Meta:
        model = Compra
        fields = ['proveedor', 'observaciones']
        widgets = {
            'proveedor': forms.Select(attrs={
                'class': 'form-select rounded-pill px-3',
                'required': True
            }),
            'observaciones': forms.Textarea(attrs={
                'class': 'form-control rounded-3',
                'rows': 3,
                'placeholder': 'Observaciones de la compra...'
            })
        }

class DetalleCompraForm(forms.ModelForm):
    class Meta:
        model = DetalleCompra
        fields = ['producto', 'cantidad', 'precio_compra']
        widgets = {
            'producto': forms.Select(attrs={
                'class': 'form-select rounded-pill px-3',
                'required': True
            }),
            'cantidad': forms.NumberInput(attrs={
                'class': 'form-control rounded-pill px-3',
                'min': 1,
                'required': True
            }),
            'precio_compra': forms.NumberInput(attrs={
                'class': 'form-control rounded-pill px-3',
                'step': '0.01',
                'min': 0,
                'required': True
            })
        } 