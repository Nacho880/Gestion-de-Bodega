from django.core.management.base import BaseCommand
from usuario.models import Usuario

class Command(BaseCommand):
    help = 'Elimina el usuario admin inseguro'

    def handle(self, *args, **options):
        try:
            # Buscar el usuario admin
            admin_user = Usuario.all_objects.filter(nombre_usuario='admin').first()
            
            if admin_user:
                self.stdout.write(f'Usuario encontrado: {admin_user.nombre_usuario} - {admin_user.correo}')
                
                # Eliminar el usuario
                admin_user.delete()
                self.stdout.write(
                    self.style.SUCCESS('Usuario admin eliminado correctamente.')
                )
            else:
                self.stdout.write(
                    self.style.WARNING('No se encontró el usuario admin.')
                )
                
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error al eliminar usuario: {str(e)}')
            ) 