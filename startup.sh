#!/bin/bash

# 起動スクリプト for App Runner
# migrate を実行してから gunicorn を起動

echo "Running database migrations..."
venv/bin/python manage.py migrate --noinput

echo "Starting Gunicorn server..."
exec venv/bin/gunicorn --bind 0.0.0.0:8000 keyron_project.wsgi:application
