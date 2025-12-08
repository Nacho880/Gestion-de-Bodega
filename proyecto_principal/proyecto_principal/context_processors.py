def usuario_context(request):
    """
    Context processor para agregar información del usuario a todas las plantillas
    """
    from usuario.models import Usuario
    from usuario.views import es_dueño, es_admin
    
    nombre_usuario = request.session.get('usuario_nombre', 'Invitado')
    usuario_id = request.session.get('usuario_id')
    es_primer_usuario = False
    es_admin_user = False
    es_dueño_user = False
    
    if usuario_id:
        try:
            usuario = Usuario.objects.get(id_usuario=usuario_id)
            primer_usuario = Usuario.objects.order_by('id_usuario').first()
            if primer_usuario and primer_usuario.id_usuario == usuario_id:
                es_primer_usuario = True
            # Verificar roles usando las funciones de views
            es_dueño_user = es_dueño(usuario_id)
            es_admin_user = es_admin(usuario_id)
        except:
            pass
    
    return {
        'nombre_usuario': nombre_usuario,
        'es_primer_usuario': es_primer_usuario,
        'es_admin_user': es_admin_user,
        'es_dueño_user': es_dueño_user
    } 