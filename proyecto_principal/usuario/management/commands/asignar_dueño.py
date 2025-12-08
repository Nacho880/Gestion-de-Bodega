from django.core.management.base import BaseCommand
from usuario.models import Usuario


class Command(BaseCommand):
    help = 'Asigna el rol de dueño al primer usuario creado (menor id_usuario)'

    def handle(self, *args, **options):
        try:
            # Obtener el primer usuario (menor id_usuario) que no esté eliminado
            primer_usuario = Usuario.objects.filter(eliminado=False).order_by('id_usuario').first()
            
            if primer_usuario:
                if primer_usuario.es_dueño:
                    self.stdout.write(
                        self.style.WARNING(
                            f'El usuario {primer_usuario.nombre_usuario} (ID: {primer_usuario.id_usuario}) ya es dueño.'
                        )
                    )
                else:
                    primer_usuario.es_dueño = True
                    primer_usuario.save(update_fields=['es_dueño'])
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'Usuario {primer_usuario.nombre_usuario} (ID: {primer_usuario.id_usuario}) ahora es dueño.'
                        )
                    )
            else:
                self.stdout.write(
                    self.style.WARNING('No se encontró ningún usuario activo en la base de datos.')
                )
                
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error al asignar dueño: {str(e)}')
            )
