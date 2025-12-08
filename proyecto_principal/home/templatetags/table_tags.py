from django import template
from django.utils.html import format_html

register = template.Library()


@register.filter
def getattr(obj, attr):
    """Obtiene un atributo de un objeto."""
    try:
        if hasattr(obj, attr):
            value = getattr(obj, attr)
            # Si es un método, llamarlo
            if callable(value):
                return value()
            return value
        # Intentar acceso por diccionario
        if isinstance(obj, dict):
            return obj.get(attr, '—')
        return '—'
    except:
        return '—'


@register.simple_tag
def build_table_url(request, **kwargs):
    """Construye una URL con parámetros preservando los existentes."""
    if not request:
        return "?"
    params = request.GET.copy()
    for key, value in kwargs.items():
        if value:
            params[key] = str(value)
        elif key in params:
            del params[key]
    url = params.urlencode()
    return f"?{url}" if url else "?"

