#!/bin/bash

# 起動スクリプト for App Runner
# migrate を実行してから gunicorn を起動

echo "Running database migrations..."
venv/bin/python manage.py migrate --noinput

# 初期管理者ユーザーの作成（存在しない場合のみ）
echo "Checking for initial admin user..."
venv/bin/python << 'EOF'
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'keyron_project.settings')
django.setup()

from django.contrib.auth import get_user_model
User = get_user_model()

# 環境変数から認証情報を取得（設定されていない場合はデフォルト値を使用）
admin_email = os.environ.get('DJANGO_SUPERUSER_EMAIL', 'admin@hirano-koumuten.co.jp')
admin_password = os.environ.get('DJANGO_SUPERUSER_PASSWORD', 'HiranoAdmin2024!')

# ユーザーが存在しない場合のみ作成
if not User.objects.filter(email=admin_email).exists():
    print(f"Creating initial admin user: {admin_email}")
    user = User.objects.create_superuser(
        email=admin_email,
        password=admin_password,
        name='システム管理者'
    )
    print(f"Admin user created successfully!")
else:
    print(f"Admin user already exists: {admin_email}")
EOF

echo "Starting Gunicorn server..."
exec venv/bin/gunicorn --bind 0.0.0.0:8000 keyron_project.wsgi:application
