#!/bin/bash

# 起動スクリプト for App Runner

echo "Running database migrations..."
venv/bin/python manage.py migrate --noinput

echo "Fixing duplicate usernames..."
venv/bin/python manage.py fix_duplicate_usernames || true

echo "Creating initial admin user..."
venv/bin/python manage.py shell -c "
from django.contrib.auth import get_user_model
import os
User = get_user_model()
email = os.environ.get('DJANGO_SUPERUSER_EMAIL', 'admin@hirano-koumuten.co.jp')
password = os.environ.get('DJANGO_SUPERUSER_PASSWORD', 'HiranoAdmin2024!')
username = email  # usernameはemailと同じにする
if not User.objects.filter(email=email).exists():
    User.objects.create_superuser(username=username, email=email, password=password)
    print(f'Admin user created: {email}')
else:
    print(f'Admin user already exists: {email}')
"

echo "Creating Hirano users..."
venv/bin/python manage.py create_hirano_users || true

echo "Setting up approval routes..."
venv/bin/python manage.py setup_approval_route || true

echo "Fixing invoice approval steps (Safeguard)..."
venv/bin/python manage.py fix_invoice_approval_steps || true

echo "Setting up test data..."
venv/bin/python manage.py setup_approval_test || true

echo "Creating current month invoice period..."
venv/bin/python manage.py shell -c "
from invoices.models import MonthlyInvoicePeriod, Company
from django.utils import timezone
from datetime import datetime

company = Company.objects.first()
if company:
    now = timezone.now()
    period, created = MonthlyInvoicePeriod.objects.get_or_create(
        company=company,
        year=now.year,
        month=now.month,
        defaults={
            'deadline_date': datetime(now.year, now.month, 25, 23, 59, 59),
            'is_closed': False
        }
    )
    if created:
        print(f'✅ 請求期間を作成: {period.period_name}')
    else:
        print(f'⚠️  請求期間は既存: {period.period_name}')
else:
    print('❌ 会社が見つかりません')
" || true

echo "Starting Gunicorn server..."
exec venv/bin/gunicorn --bind 0.0.0.0:8000 keyron_project.wsgi:application
