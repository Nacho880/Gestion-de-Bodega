from django.core.management.base import BaseCommand
from home.models import Reembolso


class Command(BaseCommand):
    help = 'Asigna números de reembolso a todos los reembolsos que no los tengan'

    def handle(self, *args, **options):
        self.stdout.write('Asignando números de reembolso...')
        
        # Asignar números faltantes
        Reembolso.asignar_numeros_faltantes()
        
        # Contar reembolsos procesados
        total_reembolsos = Reembolso.objects.count()
        reembolsos_con_numero = Reembolso.objects.filter(numero_reembolso__isnull=False).count()
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Proceso completado. {reembolsos_con_numero} de {total_reembolsos} reembolsos tienen número asignado.'
            )
        ) 