from django.core.management.base import BaseCommand
from home.models import Venta


class Command(BaseCommand):
    help = 'Asigna números de venta a todas las ventas que no los tengan'

    def handle(self, *args, **options):
        self.stdout.write('Asignando números de venta...')
        
        # Asignar números faltantes
        Venta.asignar_numeros_faltantes()
        
        # Contar ventas procesadas
        total_ventas = Venta.objects.count()
        ventas_con_numero = Venta.objects.filter(numero_venta__isnull=False).count()
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Proceso completado. {ventas_con_numero} de {total_ventas} ventas tienen número asignado.'
            )
        ) 