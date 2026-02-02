#!/bin/bash
# set -e removed to prevent crash on migration failure

echo "=========================================="
echo "   STARTING APP - VERSION: 2026-02-03_FIX_V4_ROBUST"
echo "=========================================="

echo "[INFO] Waiting for database..."
# 簡易的な待機ロジック (必要であれば)

echo "[INFO] Running database migrations..."
if venv/bin/python manage.py migrate --noinput; then
    echo "[SUCCESS] Migrations completed."
else
    echo "[ERROR] Migrations failed! Check the logs above for details."
    echo "[INFO] Continuing startup sequence to allow log retrieval..."
fi

echo "[INFO] Creating superuser..."
venv/bin/python manage.py shell -c "from django.contrib.auth import get_user_model; User = get_user_model(); User.objects.filter(username='admin').exists() or User.objects.create_superuser('admin', 'admin@example.com', 'admin')" || echo "[WARN] Superuser creation failed (might already exist)"

echo "[INFO] Starting Gunicorn..."
exec venv/bin/gunicorn keyron_project.wsgi:application --bind 0.0.0.0:8000
