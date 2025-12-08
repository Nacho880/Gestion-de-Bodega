#!/bin/bash
# Build script for Vercel deployment

# Instalar dependencias
echo "Instalando dependencias..."
pip install -r requirements.txt

# Ir al directorio del proyecto Django
cd proyecto_principal

# Ejecutar collectstatic para recopilar archivos estáticos
echo "Recopilando archivos estáticos..."
python manage.py collectstatic --noinput --clear

# Volver al directorio raíz
cd ..

echo "Build completado"
