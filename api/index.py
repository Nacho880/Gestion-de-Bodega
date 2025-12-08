"""
Vercel serverless function handler for Django
Exponer la aplicación WSGI directamente para Vercel
"""
import os
import sys
from pathlib import Path

# Add proyecto_principal to Python path
BASE_DIR = Path(__file__).resolve().parent.parent
proyecto_path = BASE_DIR / 'proyecto_principal'
sys.path.insert(0, str(proyecto_path))
sys.path.insert(0, str(BASE_DIR))

# Set Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'proyecto_principal.settings')

# Initialize Django
import django
django.setup()

from django.core.wsgi import get_wsgi_application

# Exponer la aplicación WSGI directamente como 'app'
# Vercel espera que se llame 'app', no 'application' ni 'handler'
app = get_wsgi_application()
