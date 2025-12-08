#!/bin/bash
# Build script for Vercel deployment

# Install dependencies
pip install -r requirements.txt

# Collect static files
cd proyecto_principal
python manage.py collectstatic --noinput

# Run migrations (optional, can be done via Vercel environment)
# python manage.py migrate --noinput
