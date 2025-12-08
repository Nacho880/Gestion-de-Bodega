from django.shortcuts import render, redirect, get_object_or_404
from django.http import HttpResponse, JsonResponse
from django.urls import reverse
from django.contrib import messages
from django.core.mail import send_mail
from django.conf import settings
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
from .models import Usuario
from .forms import UsuarioCreationForm
import random
import traceback
import re

def validar_password(password):
    """
    Valida que la contraseña cumpla con los requisitos:
    - Mínimo 8 caracteres
    - Al menos 1 mayúscula
    - Al menos 1 número
    Retorna (es_valida, mensaje_error)
    """
    if len(password) < 8:
        return False, 'La contraseña debe tener al menos 8 caracteres.'
    
    if not re.search(r'[A-Z]', password):
        return False, 'La contraseña debe contener al menos una letra mayúscula.'
    
    if not re.search(r'[0-9]', password):
        return False, 'La contraseña debe contener al menos un número.'
    
    return True, None

def limpiar_mensajes_sistema(request):
    """
    Función para limpiar todos los mensajes del sistema de forma segura
    """
    try:
        from django.contrib.messages import get_messages
        storage = get_messages(request)
        storage.used = True
    except:
        # Si hay algún error, simplemente ignoramos
        pass

def login(request):
    # Eliminar la creación automática del usuario admin
    # if not Usuario.all_objects.filter(nombre_usuario='admin').exists():
    #     admin_user = Usuario(nombre_usuario='admin', correo='admin@example.com')
    #     admin_user.set_password('admin123')
    #     admin_user.save()

    if request.session.get('usuario_id'):
        return redirect('main')  

    # Limpiar mensajes del sistema para evitar que aparezcan mensajes de otras partes
    limpiar_mensajes_sistema(request)
    
    # Verificar si es una petición AJAX
    is_ajax = request.headers.get('X-Requested-With') == 'XMLHttpRequest'

    if request.method == 'POST':
        nombre = request.POST.get('username', '').strip()
        clave = request.POST.get('password', '').strip()

        # Buscar usuario de manera insensible a mayúsculas/minúsculas
        usuario = Usuario.objects.filter(nombre_usuario__iexact=nombre).first()

        if usuario and usuario.check_password(clave):
            request.session['usuario_id'] = usuario.id_usuario
            request.session['usuario_nombre'] = usuario.nombre_usuario
            request.session['correo_usuario'] = usuario.correo
            if is_ajax:
                return JsonResponse({
                    'success': True,
                    'message': 'Inicio de sesión exitoso',
                    'redirect': reverse('main')
                })
            messages.success(request, 'Inicio de sesión exitoso')
            return redirect('main')  
        
        if is_ajax:
            return JsonResponse({
                'success': False,
                'message': 'Usuario o contraseña incorrectos'
            })

    # Verificar si existen usuarios en el sistema
    existen_usuarios = Usuario.objects.exists()
    
    return render(request, 'usuario/login.html', {
        'existen_usuarios': existen_usuarios
    })

def logout_view(request):
    request.session.flush()
    return redirect('login')

def verificacion(request):
    # Limpiar mensajes del sistema
    limpiar_mensajes_sistema(request)
    
    # Verificar si es una petición AJAX
    is_ajax = request.headers.get('X-Requested-With') == 'XMLHttpRequest'
    
    if request.method == 'POST':
        correo = request.POST.get('correo', '').strip()

        if not correo:
            if is_ajax:
                return JsonResponse({'success': False, 'message': 'Debes ingresar un correo.'})
            messages.error(request, 'Debes ingresar un correo.')
            return render(request, 'usuario/verificacion.html')

        try:
            validate_email(correo)
        except ValidationError:
            if is_ajax:
                return JsonResponse({'success': False, 'message': 'El correo no tiene un formato válido.'})
            messages.error(request, 'El correo no tiene un formato válido.')
            return render(request, 'usuario/verificacion.html')

        usuario = Usuario.objects.filter(correo__iexact=correo).first()
        if not usuario:
            if is_ajax:
                return JsonResponse({'success': False, 'message': 'No existe una cuenta con este correo.'})
            messages.error(request, 'Este correo no está autorizado para registrar nuevos usuarios.')
            return render(request, 'usuario/verificacion.html')

        codigo = str(random.randint(100000, 999999))
        request.session.update({
            'codigo_enviado': codigo,
            'correo': correo.lower()
        })
        request.session.modified = True
        request.session.save()

        try:
            send_mail(
                'Código de verificación para crear usuario',
                f'Tu código de verificación es: {codigo}',
                settings.EMAIL_HOST_USER,
                [correo]
            )
            if is_ajax:
                return JsonResponse({
                    'success': True,
                    'message': 'Código enviado correctamente.',
                    'redirect': reverse('verificar')
                })
            messages.success(request, 'Código enviado correctamente. Revisa tu correo autorizado.')
            return redirect('verificar')
        except Exception as e:
            if is_ajax:
                return JsonResponse({'success': False, 'message': f'Error al enviar el correo: {e}'})
            messages.error(request, f'Error al enviar el correo: {e}')

    return render(request, 'usuario/verificacion.html')

def verificar(request):
    # Limpiar mensajes del sistema
    limpiar_mensajes_sistema(request)
    
    # Verificar si es una petición AJAX
    is_ajax = request.headers.get('X-Requested-With') == 'XMLHttpRequest'
    
    if request.method == 'POST':
        codigo_usuario = request.POST.get('codigo', '').strip()
        codigo_correcto = request.session.get('codigo_enviado')

        if codigo_usuario == codigo_correcto:
            request.session['verificado'] = True
            request.session.modified = True
            request.session.save()
            if is_ajax:
                return JsonResponse({
                    'success': True,
                    'message': 'Código verificado correctamente.',
                    'redirect': reverse('recuperar')
                })
            messages.success(request, 'Código verificado correctamente.')
            return redirect('recuperar')

        if is_ajax:
            return JsonResponse({'success': False, 'message': 'Código incorrecto'})
        messages.error(request, 'Código incorrecto. Intenta de nuevo.')

    return render(request, 'usuario/verificar.html')

def recuperar(request):
    # Limpiar mensajes del sistema
    limpiar_mensajes_sistema(request)
    
    # Verificar si es una petición AJAX
    is_ajax = request.headers.get('X-Requested-With') == 'XMLHttpRequest'
    
    if request.method == 'POST':
        nueva_password = request.POST.get('password', '').strip()
        confirmar_password = request.POST.get('password2', '').strip()

        if not nueva_password or not confirmar_password:
            if is_ajax:
                return JsonResponse({'success': False, 'message': 'Completa todos los campos.'})
            messages.error(request, 'Completa todos los campos.')
        elif nueva_password != confirmar_password:
            if is_ajax:
                return JsonResponse({'success': False, 'message': 'Las contraseñas no coinciden.'})
            messages.error(request, 'Las contraseñas no coinciden.')
        else:
            # Validar requisitos de contraseña
            password_valida, password_error = validar_password(nueva_password)
            if not password_valida:
                if is_ajax:
                    return JsonResponse({'success': False, 'message': password_error})
                messages.error(request, password_error)
                return render(request, 'usuario/recuperar.html')
            
            correo = request.session.get('correo')
            usuario = Usuario.objects.filter(correo=correo).first()

            if usuario:
                usuario.set_password(nueva_password)
                usuario.save()

                request.session.flush()
                if is_ajax:
                    return JsonResponse({
                        'success': True,
                        'message': 'Contraseña actualizada correctamente.',
                        'redirect': reverse('login')
                    })
                messages.success(request, 'Contraseña actualizada correctamente.')
                return redirect('login')

            if is_ajax:
                return JsonResponse({'success': False, 'message': 'No existe ningún usuario registrado con ese correo.'})
            messages.error(request, 'No existe ningún usuario registrado con ese correo.')

    return render(request, 'usuario/recuperar.html')

def lista_perfiles(request):
    if not request.session.get('usuario_id'):
        return redirect('login')
    
    from django.db.models import Q
    from django.core.paginator import Paginator
    
    nombre_usuario = request.session.get('usuario_nombre', 'Invitado')
    
    # Obtener parámetros de búsqueda y ordenamiento
    search_query = request.GET.get('search', '').strip()
    sort_field = request.GET.get('sort', 'nombre_usuario')
    order = request.GET.get('order', 'asc')
    per_page = int(request.GET.get('per_page', 10))
    
    # Obtener todos los usuarios
    usuarios = Usuario.objects.all()
    
    # Aplicar búsqueda
    if search_query:
        usuarios = usuarios.filter(
            Q(nombre_usuario__icontains=search_query) |
            Q(correo__icontains=search_query)
        )
    
    # Aplicar ordenamiento
    sort_fields_map = {
        'nombre_usuario': 'nombre_usuario',
        'correo': 'correo',
    }
    
    if sort_field in sort_fields_map:
        sort_key = sort_fields_map[sort_field]
        if order == 'desc':
            sort_key = f'-{sort_key}'
        usuarios = usuarios.order_by(sort_key)
    else:
        usuarios = usuarios.order_by('nombre_usuario')
    
    # Paginación
    paginator = Paginator(usuarios, per_page)
    page_number = request.GET.get('page', 1)
    page_obj = paginator.get_page(page_number)
    
    # Si es una petición AJAX, devolver solo el contenido de la tabla
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return render(request, 'usuario/perfiles/partials/table_content.html', {
            'usuarios': page_obj,
            'page_obj': page_obj,
            'search_query': search_query,
            'sort_field': sort_field,
            'order': order,
        })
    
    usuario_id_sesion = request.session.get('usuario_id')
    
    return render(request, 'usuario/perfiles/lista_perfiles.html', {
        'usuarios': page_obj,
        'page_obj': page_obj,
        'nombre_usuario': nombre_usuario,
        'usuario_id_sesion': usuario_id_sesion,
        'search_query': search_query,
        'sort_field': sort_field,
        'order': order,
    })

def nuevo_perfil(request):
    if not request.session.get('usuario_id'):
        return redirect('login')
    
    if request.method == 'POST':
        nombre = request.POST.get('username', '').strip()
        correo = request.POST.get('email', '').strip()
        password = request.POST.get('password', '').strip()
        confirm_password = request.POST.get('password2', '').strip()

        # Verificar si es una petición AJAX
        is_ajax = request.headers.get('X-Requested-With') == 'XMLHttpRequest'

        if not all([nombre, correo, password, confirm_password]):
            if is_ajax:
                return JsonResponse({
                    'success': False,
                    'message': 'Todos los campos son obligatorios.'
                })
            else:
                messages.error(request, 'Todos los campos son obligatorios.')
                return redirect('lista_perfiles')

        if password != confirm_password:
            if is_ajax:
                return JsonResponse({
                    'success': False,
                    'message': 'Las contraseñas no coinciden.'
                })
            else:
                messages.error(request, 'Las contraseñas no coinciden.')
                return redirect('lista_perfiles')

        # Validar requisitos de contraseña
        password_valida, password_error = validar_password(password)
        if not password_valida:
            if is_ajax:
                return JsonResponse({
                    'success': False,
                    'message': password_error
                })
            else:
                messages.error(request, password_error)
                return redirect('lista_perfiles')

        # Verificar si el nombre de usuario ya existe (incluyendo usuarios eliminados) - insensible a mayúsculas
        usuario_existente = Usuario.all_objects.filter(nombre_usuario__iexact=nombre).first()
        if usuario_existente:
            if usuario_existente.eliminado:
                # Si el usuario está eliminado, lo restauramos y actualizamos sus datos
                usuario_existente.restore()
                usuario_existente.correo = correo
                usuario_existente.set_password(password)
                usuario_existente.save()
                
                success_msg = 'Perfil agregado correctamente.'
                if is_ajax:
                    return JsonResponse({
                        'success': True,
                        'message': success_msg,
                        'usuario': {
                            'id': usuario_existente.id_usuario,
                            'nombre': usuario_existente.nombre_usuario,
                            'correo': usuario_existente.correo
                        }
                    })
                else:
                    messages.success(request, success_msg)
                    return redirect('lista_perfiles')
            else:
                error_msg = 'El nombre de usuario ya existe.'
                
                if is_ajax:
                    return JsonResponse({
                        'success': False,
                        'message': error_msg
                    })
                else:
                    messages.error(request, error_msg)
                    return redirect('lista_perfiles')

        # Verificar si el correo ya existe (incluyendo usuarios eliminados)
        correo_existente = Usuario.all_objects.filter(correo=correo).first()
        if correo_existente:
            if correo_existente.eliminado:
                # Si el correo está eliminado, lo restauramos y actualizamos sus datos
                correo_existente.restore()
                correo_existente.nombre_usuario = nombre
                correo_existente.set_password(password)
                correo_existente.save()
                
                success_msg = 'Perfil agregado correctamente.'
                if is_ajax:
                    return JsonResponse({
                        'success': True,
                        'message': success_msg,
                        'usuario': {
                            'id': correo_existente.id_usuario,
                            'nombre': correo_existente.nombre_usuario,
                            'correo': correo_existente.correo
                        }
                    })
                else:
                    messages.success(request, success_msg)
                    return redirect('lista_perfiles')
            else:
                error_msg = 'El correo ya está registrado.'
                
                if is_ajax:
                    return JsonResponse({
                        'success': False,
                        'message': error_msg
                    })
                else:
                    messages.error(request, error_msg)
                    return redirect('lista_perfiles')

        # Validar formato del correo
        try:
            validate_email(correo)
        except ValidationError:
            if is_ajax:
                return JsonResponse({
                    'success': False,
                    'message': 'El correo electrónico no tiene un formato válido.'
                })
            messages.error(request, 'El correo electrónico no tiene un formato válido.')
            return redirect('lista_perfiles')

        # Generar código de verificación
        codigo = str(random.randint(100000, 999999))
        
        # Guardar datos en la sesión para usarlos después de la verificación
        request.session['nuevo_perfil_datos'] = {
            'nombre': nombre,
            'correo': correo,
            'password': password
        }
        request.session['nuevo_perfil_codigo'] = codigo
        request.session.modified = True
        request.session.save()
        
        # Enviar correo con el código
        try:
            send_mail(
                'Código de verificación - Crear nuevo perfil',
                f'Tu código de verificación es: {codigo}\n\nEste código es válido por 10 minutos.',
                settings.EMAIL_HOST_USER,
                [correo]
            )
            if is_ajax:
                return JsonResponse({
                    'success': True,
                    'message': f'Se ha enviado un código de verificación a {correo}.',
                    'needs_verification': True,
                    'correo': correo
                })
            messages.success(request, f'Se ha enviado un código de verificación a {correo}.')
            return redirect('lista_perfiles')
        except Exception as e:
            error_msg = f'Error al enviar el correo de verificación: {str(e)}'
            if is_ajax:
                return JsonResponse({
                    'success': False,
                    'message': error_msg
                })
            messages.error(request, error_msg)
            return redirect('lista_perfiles')
    
    # Si es GET, redirigir a la lista de perfiles
    return redirect('lista_perfiles')

def verificar_nuevo_perfil(request):
    """
    Vista para verificar el código enviado al correo al crear un nuevo perfil.
    """
    if not request.session.get('usuario_id'):
        return redirect('login')
    
    # Verificar si es una petición AJAX
    is_ajax = request.headers.get('X-Requested-With') == 'XMLHttpRequest'
    
    # Verificar que existan datos en la sesión
    datos_perfil = request.session.get('nuevo_perfil_datos')
    codigo_correcto = request.session.get('nuevo_perfil_codigo')
    
    if not datos_perfil or not codigo_correcto:
        if is_ajax:
            return JsonResponse({
                'success': False,
                'message': 'No hay datos de registro pendientes. Por favor, inicia el proceso nuevamente.'
            })
        messages.error(request, 'No hay datos de registro pendientes.')
        return redirect('lista_perfiles')
    
    if request.method == 'POST':
        codigo_ingresado = request.POST.get('codigo', '').strip()
        
        if codigo_ingresado == codigo_correcto:
            try:
                # Verificar si el nombre de usuario ya existe (por si acaso cambió algo)
                usuario_existente = Usuario.all_objects.filter(nombre_usuario__iexact=datos_perfil['nombre']).first()
                if usuario_existente and not usuario_existente.eliminado:
                    # Limpiar sesión
                    request.session.pop('nuevo_perfil_datos', None)
                    request.session.pop('nuevo_perfil_codigo', None)
                    if is_ajax:
                        return JsonResponse({
                            'success': False,
                            'message': 'El nombre de usuario ya existe.'
                        })
                    messages.error(request, 'El nombre de usuario ya existe.')
                    return redirect('lista_perfiles')
                
                # Verificar si el correo ya existe
                correo_existente = Usuario.all_objects.filter(correo=datos_perfil['correo']).first()
                if correo_existente and not correo_existente.eliminado:
                    # Limpiar sesión
                    request.session.pop('nuevo_perfil_datos', None)
                    request.session.pop('nuevo_perfil_codigo', None)
                    if is_ajax:
                        return JsonResponse({
                            'success': False,
                            'message': 'El correo ya está registrado.'
                        })
                    messages.error(request, 'El correo ya está registrado.')
                    return redirect('lista_perfiles')
                
                # Crear el usuario
                usuario = Usuario.objects.create(
                    nombre_usuario=datos_perfil['nombre'],
                    correo=datos_perfil['correo']
                )
                usuario.set_password(datos_perfil['password'])
                usuario.save()
                
                # Limpiar datos de la sesión
                request.session.pop('nuevo_perfil_datos', None)
                request.session.pop('nuevo_perfil_codigo', None)
                
                if is_ajax:
                    return JsonResponse({
                        'success': True,
                        'message': 'Perfil agregado correctamente.',
                        'usuario': {
                            'id': usuario.id_usuario,
                            'nombre': usuario.nombre_usuario,
                            'correo': usuario.correo
                        }
                    })
                messages.success(request, 'Perfil agregado correctamente.')
                return redirect('lista_perfiles')
                
            except Exception as e:
                if is_ajax:
                    return JsonResponse({
                        'success': False,
                        'message': f'Error al crear el perfil: {str(e)}'
                    })
                messages.error(request, f'Error al crear el perfil: {str(e)}')
                return redirect('lista_perfiles')
        else:
            if is_ajax:
                return JsonResponse({
                    'success': False,
                    'message': 'El código ingresado es incorrecto'
                })
            messages.error(request, 'El código ingresado es incorrecto.')
            return redirect('lista_perfiles')
    
    # Si es GET, devolver error
    if is_ajax:
        return JsonResponse({
            'success': False,
            'message': 'Método no permitido'
        })
    return redirect('lista_perfiles')

def verificar_editar_perfil(request):
    """
    Vista para verificar el código enviado al correo al editar un perfil y cambiar la contraseña.
    """
    if not request.session.get('usuario_id'):
        return JsonResponse({
            'success': False,
            'message': 'No tienes permisos para realizar esta acción.'
        })
    
    # Verificar si es una petición AJAX
    is_ajax = request.headers.get('X-Requested-With') == 'XMLHttpRequest'
    
    # Verificar que exista código en la sesión
    codigo_correcto = request.session.get('editar_perfil_codigo')
    
    if not codigo_correcto:
        return JsonResponse({
            'success': False,
            'message': 'No hay código de verificación pendiente. Por favor, marca "Cambiar contraseña" nuevamente.'
        })
    
    if request.method == 'POST':
        codigo_ingresado = request.POST.get('codigo', '').strip()
        id_usuario = request.POST.get('id_usuario', '').strip()
        
        if codigo_ingresado == codigo_correcto:
            # Guardar en sesión que el código está verificado
            request.session['editar_perfil_verificado'] = True
            request.session['editar_perfil_usuario_id'] = id_usuario
            request.session.modified = True
            request.session.save()
            
            return JsonResponse({
                'success': True,
                'message': 'Código verificado correctamente.'
            })
        else:
            return JsonResponse({
                'success': False,
                'message': 'El código ingresado es incorrecto.'
            })
    
    # Si es GET, devolver error
    return JsonResponse({
        'success': False,
        'message': 'Método no permitido'
    })

def eliminar_perfil(request, id_usuario):
    # Verificar autenticación
    if not request.session.get('usuario_id'):
        return JsonResponse({
            'success': False,
            'message': 'No tienes permisos para realizar esta acción.'
        })
    
    if request.method == 'POST':
        try:
            usuario = get_object_or_404(Usuario, id_usuario=id_usuario)
            total_usuarios = Usuario.objects.count()
            usuario_actual_id = request.session.get('usuario_id')

            # No permitir borrar el último usuario
            if total_usuarios <= 1:
                return JsonResponse({
                    'success': False,
                    'message': 'No se puede eliminar el último perfil existente en el sistema.'
                })
            
            # No permitir que un usuario se borre a sí mismo
            if usuario.id_usuario == usuario_actual_id:
                return JsonResponse({
                    'success': False,
                    'message': 'No puedes borrar tu propio perfil mientras estás logueado.'
                })
            
            # Usar soft delete en lugar de eliminación física
            usuario.soft_delete()
            return JsonResponse({
                'success': True,
                'message': 'Perfil eliminado correctamente.'
            })
            
        except Usuario.DoesNotExist:
            return JsonResponse({
                'success': False,
                'message': 'El perfil no existe.'
            })
        except Exception as e:
            error_trace = traceback.format_exc()
            return JsonResponse({
                'success': False,
                'message': f'Error al eliminar el perfil: {str(e)}'
            })
    
    return JsonResponse({
        'success': False,
        'message': 'Método no permitido.'
    })

def restaurar_perfil(request, id_usuario):
    # Verificar autenticación
    if not request.session.get('usuario_id'):
        return JsonResponse({
            'success': False,
            'message': 'No tienes permisos para realizar esta acción.'
        })
    
    if request.method == 'POST':
        try:
            # Usar all_objects para acceder a usuarios eliminados
            usuario = get_object_or_404(Usuario.all_objects, id_usuario=id_usuario)
            
            # Verificar que el usuario esté eliminado
            if not usuario.eliminado:
                return JsonResponse({
                    'success': False,
                    'message': 'El perfil no está eliminado.'
                })
            
            # Restaurar el usuario
            usuario.restore()
            
            return JsonResponse({
                'success': True,
                'message': 'Perfil restaurado correctamente.',
                'usuario': {
                    'id': usuario.id_usuario,
                    'nombre': usuario.nombre_usuario,
                    'correo': usuario.correo
                }
            })
            
        except Usuario.DoesNotExist:
            return JsonResponse({
                'success': False,
                'message': 'El perfil no existe.'
            })
        except Exception as e:
            error_trace = traceback.format_exc()
            return JsonResponse({
                'success': False,
                'message': f'Error al restaurar el perfil: {str(e)}'
            })
    
    return JsonResponse({
        'success': False,
        'message': 'Método no permitido.'
    })

def editar_perfil_ajax(request, id_usuario):
    # Verificar autenticación
    if not request.session.get('usuario_id'):
        return JsonResponse({
            'success': False,
            'message': 'No tienes permisos para realizar esta acción.'
        })
    
    if request.method == 'POST':
        try:
            usuario = get_object_or_404(Usuario, id_usuario=id_usuario)
            
            # Verificar si solo se está solicitando enviar el código de verificación
            if request.POST.get('enviar_codigo') == 'true':
                correo_verificacion = request.POST.get('correo', '').strip()
                
                if not correo_verificacion:
                    correo_verificacion = usuario.correo
                
                if not correo_verificacion:
                    return JsonResponse({
                        'success': False,
                        'message': 'Se requiere un correo electrónico para cambiar la contraseña.'
                    })
                
                # Generar código de verificación de 6 dígitos
                codigo = str(random.randint(100000, 999999))
                
                # Guardar datos en la sesión
                request.session['editar_perfil_codigo'] = codigo
                request.session.modified = True
                request.session.save()
                
                # Enviar correo con el código
                try:
                    send_mail(
                        'Código de verificación - Cambiar contraseña',
                        f'Tu código de verificación es: {codigo}\n\nEste código es válido por 10 minutos.',
                        settings.EMAIL_HOST_USER,
                        [correo_verificacion]
                    )
                    return JsonResponse({
                        'success': True,
                        'message': f'Se ha enviado un código de verificación a {correo_verificacion}.',
                        'needs_verification': True,
                        'correo': correo_verificacion
                    })
                except Exception as e:
                    return JsonResponse({
                        'success': False,
                        'message': f'Error al enviar el correo de verificación: {str(e)}'
                    })
            
            nombre = request.POST.get('nombre_usuario', '').strip()
            correo = request.POST.get('correo', '').strip()
            password = request.POST.get('password', '').strip()
            confirm_password = request.POST.get('password2', '').strip()

            if not nombre:
                return JsonResponse({
                    'success': False,
                    'message': 'El nombre de usuario es obligatorio.'
                })

            # Verificar si el nombre de usuario ya existe (excluyendo el usuario actual) - insensible a mayúsculas
            if Usuario.objects.filter(nombre_usuario__iexact=nombre).exclude(id_usuario=id_usuario).exists():
                return JsonResponse({
                    'success': False,
                    'message': 'El nombre de usuario ya existe.'
                })

            # Verificar si el correo ya existe (excluyendo el usuario actual)
            if correo and Usuario.objects.filter(correo=correo).exclude(id_usuario=id_usuario).exists():
                return JsonResponse({
                    'success': False,
                    'message': 'El correo electrónico ya está registrado.'
                })

            # Actualizar datos básicos
            usuario.nombre_usuario = nombre
            usuario.correo = correo
            
            # Actualizar contraseña solo si se proporciona una nueva
            if password and confirm_password:
                # Verificar que el código esté verificado
                if not request.session.get('editar_perfil_verificado') or str(request.session.get('editar_perfil_usuario_id')) != str(id_usuario):
                    return JsonResponse({
                        'success': False,
                        'message': 'Debes verificar el código de verificación antes de cambiar la contraseña.'
                    })
                
                if password != confirm_password:
                    return JsonResponse({
                        'success': False,
                        'message': 'Las contraseñas no coinciden.'
                    })
                # Validar requisitos de contraseña
                password_valida, password_error = validar_password(password)
                if not password_valida:
                    return JsonResponse({
                        'success': False,
                        'message': password_error
                    })
                
                # Actualizar contraseña directamente (ya se verificó el código antes)
                usuario.set_password(password)
                
                # Limpiar datos de verificación de la sesión
                request.session.pop('editar_perfil_verificado', None)
                request.session.pop('editar_perfil_usuario_id', None)
                request.session.pop('editar_perfil_codigo', None)
            
            # Si no se cambia la contraseña, actualizar directamente
            usuario.save()
            
            return JsonResponse({
                'success': True,
                'message': 'Perfil actualizado correctamente.'
            })
            
        except Usuario.DoesNotExist:
            return JsonResponse({
                'success': False,
                'message': 'El perfil no existe.'
            })
        except Exception as e:
            error_trace = traceback.format_exc()
            return JsonResponse({
                'success': False,
                'message': f'Error al actualizar el perfil: {str(e)}'
            })
    
    return JsonResponse({
        'success': False,
        'message': 'Método no permitido.'
    })

def crear_primer_usuario(request):
    """
    Vista para crear el primer usuario del sistema.
    Solo es accesible cuando no existe ningún usuario en la base de datos.
    Ahora incluye verificación por correo electrónico.
    """
    # Limpiar mensajes del sistema
    limpiar_mensajes_sistema(request)
    
    # Mostrar el número real de usuarios para depuración
    total_usuarios = Usuario.objects.all().count()
    
    # Verificar si es una petición AJAX
    is_ajax = request.headers.get('X-Requested-With') == 'XMLHttpRequest'
    
    if total_usuarios > 0:
        if is_ajax:
            return JsonResponse({
                'success': False,
                'message': f'No puedes crear un usuario inicial cuando ya existen usuarios en el sistema. (Usuarios detectados: {total_usuarios})'
            })
        messages.error(request, f'No puedes crear un usuario inicial cuando ya existen usuarios en el sistema. (Usuarios detectados: {total_usuarios})')
        return redirect('login')
    
    if request.method == 'POST':
        nombre = request.POST.get('username', '').strip()
        correo = request.POST.get('email', '').strip()
        password = request.POST.get('password', '').strip()
        confirm_password = request.POST.get('password2', '').strip()

        # Validaciones
        if not all([nombre, correo, password, confirm_password]):
            if is_ajax:
                return JsonResponse({'success': False, 'message': 'Todos los campos son obligatorios.'})
            messages.error(request, 'Todos los campos son obligatorios.')
            return render(request, 'usuario/crear_primer_usuario.html', {'total_usuarios': total_usuarios})

        if password != confirm_password:
            if is_ajax:
                return JsonResponse({'success': False, 'message': 'Las contraseñas no coinciden.'})
            messages.error(request, 'Las contraseñas no coinciden.')
            return render(request, 'usuario/crear_primer_usuario.html', {'total_usuarios': total_usuarios})

        # Validar requisitos de contraseña
        password_valida, password_error = validar_password(password)
        if not password_valida:
            if is_ajax:
                return JsonResponse({'success': False, 'message': password_error})
            messages.error(request, password_error)
            return render(request, 'usuario/crear_primer_usuario.html', {'total_usuarios': total_usuarios})

        # Validar formato del correo
        try:
            validate_email(correo)
        except ValidationError:
            if is_ajax:
                return JsonResponse({'success': False, 'message': 'El correo electrónico no tiene un formato válido.'})
            messages.error(request, 'El correo electrónico no tiene un formato válido.')
            return render(request, 'usuario/crear_primer_usuario.html', {'total_usuarios': total_usuarios})

        # Verificar si el nombre de usuario ya existe - insensible a mayúsculas
        if Usuario.objects.filter(nombre_usuario__iexact=nombre).exists():
            if is_ajax:
                return JsonResponse({'success': False, 'message': 'El nombre de usuario ya existe.'})
            messages.error(request, 'El nombre de usuario ya existe.')
            return render(request, 'usuario/crear_primer_usuario.html', {'total_usuarios': total_usuarios})

        # Verificar si el correo ya existe
        if Usuario.objects.filter(correo=correo).exists():
            if is_ajax:
                return JsonResponse({'success': False, 'message': 'El correo electrónico ya está registrado.'})
            messages.error(request, 'El correo electrónico ya está registrado.')
            return render(request, 'usuario/crear_primer_usuario.html', {'total_usuarios': total_usuarios})

        # Generar código de verificación
        codigo = str(random.randint(100000, 999999))
        
        # Guardar datos en la sesión para usarlos después de la verificación
        request.session['primer_usuario_datos'] = {
            'nombre': nombre,
            'correo': correo,
            'password': password
        }
        request.session['primer_usuario_codigo'] = codigo
        request.session.modified = True
        request.session.save()  # Forzar guardado inmediato de sesión
        
        # Enviar correo con el código
        try:
            send_mail(
                'Código de verificación - Crear usuario inicial',
                f'Tu código de verificación es: {codigo}\n\nEste código es válido por 10 minutos.',
                settings.EMAIL_HOST_USER,
                [correo]
            )
            if is_ajax:
                return JsonResponse({
                    'success': True,
                    'message': f'Se ha enviado un código de verificación a {correo}. Revisa tu bandeja de entrada.',
                    'redirect': reverse('verificar_primer_usuario')
                })
            messages.success(request, f'Se ha enviado un código de verificación a {correo}. Revisa tu bandeja de entrada.')
            return redirect('verificar_primer_usuario')
        except Exception as e:
            if is_ajax:
                return JsonResponse({'success': False, 'message': f'Error al enviar el correo de verificación: {str(e)}'})
            messages.error(request, f'Error al enviar el correo de verificación: {str(e)}')
            return render(request, 'usuario/crear_primer_usuario.html', {'total_usuarios': total_usuarios})

    return render(request, 'usuario/crear_primer_usuario.html', {'total_usuarios': total_usuarios})


def verificar_primer_usuario(request):
    """
    Vista para verificar el código enviado al correo al crear el primer usuario.
    """
    # Limpiar mensajes del sistema
    limpiar_mensajes_sistema(request)
    
    # Verificar si es una petición AJAX
    is_ajax = request.headers.get('X-Requested-With') == 'XMLHttpRequest'
    
    # Verificar que existan datos en la sesión
    datos_usuario = request.session.get('primer_usuario_datos')
    codigo_correcto = request.session.get('primer_usuario_codigo')
    
    if not datos_usuario or not codigo_correcto:
        if is_ajax:
            return JsonResponse({
                'success': False,
                'message': 'No hay datos de registro pendientes. Por favor, inicia el proceso nuevamente.',
                'redirect': reverse('crear_primer_usuario')
            })
        messages.error(request, 'No hay datos de registro pendientes. Por favor, inicia el proceso nuevamente.')
        return redirect('crear_primer_usuario')
    
    # Verificar que siga sin haber usuarios
    if Usuario.objects.count() > 0:
        # Limpiar sesión
        request.session.pop('primer_usuario_datos', None)
        request.session.pop('primer_usuario_codigo', None)
        if is_ajax:
            return JsonResponse({
                'success': False,
                'message': 'Ya existe un usuario en el sistema.',
                'redirect': reverse('login')
            })
        messages.error(request, 'Ya existe un usuario en el sistema.')
        return redirect('login')
    
    if request.method == 'POST':
        codigo_ingresado = request.POST.get('codigo', '').strip()
        
        if codigo_ingresado == codigo_correcto:
            try:
                # Crear el usuario
                usuario = Usuario(
                    nombre_usuario=datos_usuario['nombre'],
                    correo=datos_usuario['correo']
                )
                usuario.set_password(datos_usuario['password'])
                usuario.save()
                
                # Limpiar datos de la sesión
                request.session.pop('primer_usuario_datos', None)
                request.session.pop('primer_usuario_codigo', None)
                
                if is_ajax:
                    return JsonResponse({
                        'success': True,
                        'message': 'Usuario inicial creado correctamente. Ya puedes iniciar sesión.',
                        'redirect': reverse('login')
                    })
                messages.success(request, 'Usuario inicial creado correctamente. Ya puedes iniciar sesión.')
                return redirect('login')
                
            except Exception as e:
                if is_ajax:
                    return JsonResponse({
                        'success': False,
                        'message': f'Error al crear el usuario: {str(e)}'
                    })
                messages.error(request, f'Error al crear el usuario: {str(e)}')
                return render(request, 'usuario/verificar_primer_usuario.html', {
                    'correo': datos_usuario['correo']
                })
        else:
            if is_ajax:
                return JsonResponse({
                    'success': False,
                    'message': 'El código ingresado es incorrecto'
                })
            messages.error(request, 'El código ingresado es incorrecto. Intenta nuevamente.')
    
    return render(request, 'usuario/verificar_primer_usuario.html', {
        'correo': datos_usuario['correo']
    })




