import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'proyecto_principal.settings')
django.setup()

from django.core.management import call_command
from django.db import connection

# Verificar si la tabla existe
with connection.cursor() as cursor:
    cursor.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'home_sucursal';
    """)
    result = cursor.fetchone()
    print(f"Tabla home_sucursal existe: {bool(result)}")

# Aplicar migraciones
print("\nAplicando migraciones...")
try:
    call_command('migrate', 'home', verbosity=2)
    print("Migraciones aplicadas exitosamente")
except Exception as e:
    print(f"Error al aplicar migraciones: {e}")

# Verificar nuevamente
with connection.cursor() as cursor:
    cursor.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'home_sucursal';
    """)
    result = cursor.fetchone()
    print(f"\nTabla home_sucursal existe después de migrar: {bool(result)}")
