# Python 3.9の公式イメージを使用
FROM python:3.9-slim

# 作業ディレクトリを設定
WORKDIR /app

# 環境変数を設定
# Pythonがpycファイルを作成しないようにする
ENV PYTHONDONTWRITEBYTECODE 1
# 標準出力・標準エラー出力をバッファリングしないようにする
ENV PYTHONUNBUFFERED 1

# システムの依存パッケージをインストール
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# 依存パッケージをインストール
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# プロジェクトのコードをコピー
COPY . /app/

# 静的ファイルを収集
RUN python manage.py collectstatic --noinput

# ポート8000を開放
EXPOSE 8000

# Gunicornを使用してアプリケーションを実行
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "keyron_project.wsgi:application"]