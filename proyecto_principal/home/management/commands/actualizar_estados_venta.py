from django.core.management.base import BaseCommand
from home.models import Venta

class Command(BaseCommand):
    help = 'Actualiza los estados antiguos de venta a los nuevos estados unificados'

    def handle(self, *args, **options):
        self.stdout.write("Actualizando estados de venta...")
        
        # Actualizar estados antiguos a nuevos
        actualizaciones = {
            'COMPLETADA': 'ACTIVO',
            'REEMBOLSADA': 'REEMBOLSADO',
            'PARCIALMENTE_REEMBOLSADA': 'PARCIALMENTE_REEMBOLSADO'
        }
        
        ventas_actualizadas = 0
        
        for estado_antiguo, estado_nuevo in actualizaciones.items():
            ventas = Venta.objects.filter(estado=estado_antiguo)
            count = ventas.count()
            if count > 0:
                ventas.update(estado=estado_nuevo)
                self.stdout.write(
                    self.style.SUCCESS(
                        f"✓ {count} ventas actualizadas de '{estado_antiguo}' a '{estado_nuevo}'"
                    )
                )
                ventas_actualizadas += count
        
        if ventas_actualizadas == 0:
            self.stdout.write(
                self.style.SUCCESS("✓ No se encontraron estados antiguos para actualizar")
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(f"✓ Total: {ventas_actualizadas} ventas actualizadas")
            ) 