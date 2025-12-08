from django.core.management.base import BaseCommand
from usuario.models import Usuario

class Command(BaseCommand):
    help = 'Verifica el estado de los usuarios en la base de datos'

    def handle(self, *args, **options):
        # Contar todos los usuarios (incluyendo eliminados)
        total_usuarios = Usuario.all_objects.count()
        usuarios_activos = Usuario.objects.count()
        usuarios_eliminados = Usuario.all_objects.filter(eliminado=True).count()
        
        self.stdout.write(
            self.style.SUCCESS(f'=== ESTADO DE USUARIOS ===')
        )
        self.stdout.write(f'Total de usuarios: {total_usuarios}')
        self.stdout.write(f'Usuarios activos: {usuarios_activos}')
        self.stdout.write(f'Usuarios eliminados: {usuarios_eliminados}')
        
        if total_usuarios > 0:
            self.stdout.write('\n=== DETALLE DE USUARIOS ===')
            for usuario in Usuario.all_objects.all():
                estado = "ACTIVO" if not usuario.eliminado else "ELIMINADO"
                self.stdout.write(
                    f'ID: {usuario.id_usuario} | '
                    f'Usuario: {usuario.nombre_usuario} | '
                    f'Correo: {usuario.correo} | '
                    f'Estado: {estado}'
                )
        else:
            self.stdout.write(
                self.style.WARNING('No hay usuarios en la base de datos.')
            ) 