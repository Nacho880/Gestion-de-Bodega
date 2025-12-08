def usuario_context(request):
    """
    Context processor para agregar información del usuario a todas las plantillas
    """
    nombre_usuario = request.session.get('usuario_nombre', 'Invitado')
    return {
        'nombre_usuario': nombre_usuario
    } 