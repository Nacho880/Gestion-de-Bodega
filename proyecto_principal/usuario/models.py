from django.db import models
from django.contrib.auth.hashers import make_password, check_password
from django.utils import timezone

class UsuarioManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().filter(eliminado=False)

class Usuario(models.Model):
    id_usuario = models.AutoField(primary_key=True)
    nombre_usuario = models.CharField(max_length=40, unique=True)
    contraseña = models.CharField(max_length=128)
    correo = models.EmailField(max_length=254, unique=True)
    eliminado = models.BooleanField(default=False)
    fecha_eliminacion = models.DateTimeField(null=True, blank=True)

    def set_password(self, raw_password):
        self.contraseña = make_password(raw_password)

    def check_password(self, raw_password):
        return check_password(raw_password, self.contraseña)

    def soft_delete(self):
        """Elimina suavemente el usuario marcándolo como eliminado"""
        self.eliminado = True
        self.fecha_eliminacion = timezone.now()
        self.save()

    def restore(self):
        """Restaura un usuario eliminado suavemente"""
        self.eliminado = False
        self.fecha_eliminacion = None
        self.save()

    objects = UsuarioManager()
    all_objects = models.Manager()  # Para acceder a todos los usuarios incluyendo eliminados

    def __str__(self):
        return self.nombre_usuario

    class Meta:
        # Solo mostrar usuarios no eliminados por defecto
        default_manager_name = 'objects'

