# 使用するPythonのベースイメージ
FROM python:3.12-alpine

# コンテナ内の作業ディレクトリを設定
WORKDIR /app

# コンテナ内にrequirements.txtをコピー
COPY requirements.txt .

# 依存関係（Djangoなど）をインストール
RUN pip install --no-cache-dir -r requirements.txt

# ローカルのプロジェクトファイルをコンテナ内にコピー
COPY . .

# アプリケーションが待ち受けるポートを指定
EXPOSE 8000

# オプション1: django-admin runserverを使用する場合
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
# オプション2: Gunicornを使用する場合（Gunicornをrequirements.txtに追加する必要があります）
# CMD ["gunicorn", "your_project_name.wsgi:application", "--bind", "