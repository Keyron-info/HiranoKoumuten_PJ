#!/bin/bash

# 起動スクリプト for App Runner

echo "Running database migrations..."
venv/bin/python manage.py migrate --noinput

echo "Creating initial admin user..."
venv/bin/python manage.py shell -c "
from django.contrib.auth import get_user_model
import os
User = get_user_model()
email = os.environ.get('DJANGO_SUPERUSER_EMAIL', 'admin@hirano-koumuten.co.jp')
password = os.environ.get('DJANGO_SUPERUSER_PASSWORD', 'HiranoAdmin2024!')
username = email.split('@')[0]
if not User.objects.filter(email=email).exists():
    User.objects.create_superuser(username=username, email=email, password=password)
    print(f'Admin user created: {email}')
else:
    print(f'Admin user already exists: {email}')
"

echo "Starting Gunicorn server..."
exec venv/bin/gunicorn --bind 0.0.0.0:8000 keyron_project.wsgi:application
