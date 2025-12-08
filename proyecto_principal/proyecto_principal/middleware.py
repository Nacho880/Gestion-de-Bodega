from django.shortcuts import redirect
from django.urls import reverse

class LoginRequiredMiddleware:
    """
    Middleware que fuerza el login para todas las páginas excepto las públicas, admin y archivos estáticos.
    """
    RUTAS_PUBLICAS = [
        '/',
        '/logout',
        '/verificacion',
        '/verificar',
        '/recuperar',
        '/crear-primer-usuario',
        '/verificar-primer-usuario',
    ]
    EXCEPCIONES_PREFIX = [
        '/static/', '/media/'
    ]

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        path = request.path.rstrip('/') or '/'
        # Permitir archivos estáticos y media
        if any(path.startswith(prefix) for prefix in self.EXCEPCIONES_PREFIX):
            return self.get_response(request)
        # Permitir admin exacto o cualquier subruta de admin
        if path == '/admin' or request.path.startswith('/admin/'):
            return self.get_response(request)
        # Permitir rutas públicas exactas
        if path in self.RUTAS_PUBLICAS:
            return self.get_response(request)
        # Permitir rutas públicas con barra final
        if path + '/' in self.RUTAS_PUBLICAS:
            return self.get_response(request)
        # Si no está autenticado, redirigir
        if not request.session.get('usuario_id'):
            return redirect(reverse('login'))
        return self.get_response(request) 