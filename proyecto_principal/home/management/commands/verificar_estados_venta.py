from django.core.management.base import BaseCommand
from home.models import Venta, DetalleVenta
from decimal import Decimal

class Command(BaseCommand):
    help = 'Verifica y corrige los estados de todas las ventas en la base de datos'

    def add_arguments(self, parser):
        parser.add_argument(
            '--corregir',
            action='store_true',
            help='Corregir automáticamente los estados incorrectos',
        )
        parser.add_argument(
            '--venta-id',
            type=int,
            help='Verificar solo una venta específica por ID',
        )

    def handle(self, *args, **options):
        corregir = options['corregir']
        venta_id = options['venta_id']
        
        if venta_id:
            ventas = Venta.objects.filter(id_venta=venta_id)
            self.stdout.write(f"Verificando solo la venta #{venta_id}")
        else:
            ventas = Venta.objects.all()
            self.stdout.write("Verificando todas las ventas...")
        
        ventas_incorrectas = 0
        ventas_corregidas = 0
        
        for venta in ventas:
            # Calcular el estado correcto
            reembolsos = venta.reembolsos.all()
            if not reembolsos.exists():
                estado_correcto = 'COMPLETADA'
            else:
                total_reembolsado = sum(reembolso.total_devuelto for reembolso in reembolsos)
                if total_reembolsado >= venta.total_venta:
                    estado_correcto = 'REEMBOLSADA'
                elif total_reembolsado > Decimal('0'):
                    estado_correcto = 'PARCIALMENTE_REEMBOLSADA'
                else:
                    estado_correcto = 'COMPLETADA'
            
            # Verificar si el estado actual es correcto
            if venta.estado != estado_correcto:
                ventas_incorrectas += 1
                self.stdout.write(
                    self.style.WARNING(
                        f"Venta #{venta.id_venta} (N°{venta.numero_venta}): "
                        f"Estado actual '{venta.estado}' debería ser '{estado_correcto}'"
                    )
                )
                
                if corregir:
                    venta.estado = estado_correcto
                    venta.save()
                    ventas_corregidas += 1
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"  ✓ Estado corregido a '{estado_correcto}'"
                        )
                    )
        
        # Verificar también los detalles de venta
        self.stdout.write("\nVerificando detalles de venta...")
        detalles_incorrectos = 0
        detalles_corregidos = 0
        
        detalles = DetalleVenta.objects.all()
        for detalle in detalles:
            # Calcular el estado correcto del detalle
            reembolsos = detalle.venta.reembolsos.filter(detalles__producto=detalle.producto)
            if not reembolsos.exists():
                estado_correcto = 'ACTIVO'
            else:
                total_reembolsado = sum(reembolso.detalles.get(producto=detalle.producto).cantidad for reembolso in reembolsos)
                if total_reembolsado >= detalle.cantidad:
                    estado_correcto = 'REEMBOLSADO'
                elif total_reembolsado > 0:
                    estado_correcto = 'PARCIALMENTE_REEMBOLSADO'
                else:
                    estado_correcto = 'ACTIVO'
            
            if detalle.estado != estado_correcto:
                detalles_incorrectos += 1
                self.stdout.write(
                    self.style.WARNING(
                        f"Detalle #{detalle.id_detalle} (Venta #{detalle.venta.id_venta}): "
                        f"Estado actual '{detalle.estado}' debería ser '{estado_correcto}'"
                    )
                )
                
                if corregir:
                    detalle.estado = estado_correcto
                    detalle.save()
                    detalles_corregidos += 1
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"  ✓ Estado corregido a '{estado_correcto}'"
                        )
                    )
        
        # Resumen final
        self.stdout.write("\n" + "="*50)
        self.stdout.write("RESUMEN DE VERIFICACIÓN")
        self.stdout.write("="*50)
        
        if ventas_incorrectas == 0:
            self.stdout.write(
                self.style.SUCCESS("✓ Todas las ventas tienen estados correctos")
            )
        else:
            self.stdout.write(
                self.style.WARNING(f"⚠ {ventas_incorrectas} ventas con estados incorrectos")
            )
            if corregir:
                self.stdout.write(
                    self.style.SUCCESS(f"✓ {ventas_corregidas} ventas corregidas")
                )
        
        if detalles_incorrectos == 0:
            self.stdout.write(
                self.style.SUCCESS("✓ Todos los detalles tienen estados correctos")
            )
        else:
            self.stdout.write(
                self.style.WARNING(f"⚠ {detalles_incorrectos} detalles con estados incorrectos")
            )
            if corregir:
                self.stdout.write(
                    self.style.SUCCESS(f"✓ {detalles_corregidos} detalles corregidos")
                )
        
        if not corregir and (ventas_incorrectas > 0 or detalles_incorrectos > 0):
            self.stdout.write(
                self.style.WARNING(
                    "\nPara corregir automáticamente los estados incorrectos, "
                    "ejecuta: python manage.py verificar_estados_venta --corregir"
                )
            ) 