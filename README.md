# 平野工務店プロジェクト - 環境構築ガイド

このドキュメントでは、平野工務店プロジェクトの開発環境を構築する手順を説明します。

## 前提条件

- macOS（Homebrewが使用可能）
- 管理者権限

## 環境構築手順

### 1. Homebrew（パッケージマネージャー）のインストール

Homebrewがインストールされていない場合、以下のコマンドでインストールします：

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

インストール後、ターミナルを再起動するか、以下のコマンドでパスを設定します：

```bash
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zshrc
eval "$(/opt/homebrew/bin/brew shellenv)"
```

### 2. Python 3.13のインストール

```bash
brew install python@3.13
python3 --version  # 確認（Python 3.13.x が表示されることを確認）
```

### 3. Git（バージョン管理）のインストール

```bash
brew install git
git --version  # 確認
```

### 4. Node.js & npm（React用）のインストール

```bash
brew install node
node --version  # 確認
npm --version   # 確認
```

### 5. PostgreSQL（本番環境用DB）のインストール

```bash
brew install postgresql@14
brew services start postgresql@14
```

PostgreSQLが正常に起動したことを確認：

```bash
psql postgres -c "SELECT version();"
```

### 6. プロジェクトのクローン

```bash
cd ~/Documents  # 任意の場所
git clone https://github.com/keyron-info/HiranoKoumuten_PJ.git
cd HiranoKoumuten_PJ
```

既にプロジェクトが存在する場合は、このステップをスキップしてください。

### 7. Python仮想環境 & Django設定

```bash
# 仮想環境の作成
python3 -m venv venv

# 仮想環境の有効化
source venv/bin/activate

# pipのアップグレード
pip install --upgrade pip

# 依存パッケージのインストール
pip install -r requirements.txt
```

### 8. React環境構築

```bash
cd frontend  # プロジェクトのfrontendディレクトリ
npm install
cd ..  # プロジェクトルートに戻る
```

### 9. 環境変数設定

プロジェクトルートに`.env`ファイルを作成し、以下の内容を設定します：

```bash
# .envファイルを作成
touch .env
```

`.env`ファイルの内容例：

```env
# Django設定
# SECRET_KEYは本番環境では必ず変更してください
SECRET_KEY=django-insecure-k=7l0(k#%0(^)woy)ktw#y@_s+)el935so!k5+sg8%nf8c(k1^
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# データベース設定（開発環境はSQLite、本番環境はPostgreSQL）
# 開発環境（SQLite使用時は以下をコメントアウト）
# DATABASE_ENGINE=django.db.backends.postgresql
# DATABASE_NAME=keyron_db
# DATABASE_USER=keyron_user
# DATABASE_PASSWORD=keyron_password
# DATABASE_HOST=localhost
# DATABASE_PORT=5432

# JWT設定（オプション）
# JWT_ACCESS_TOKEN_LIFETIME_HOURS=1
# JWT_REFRESH_TOKEN_LIFETIME_DAYS=7

# メール設定（本番環境用）
# EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
# EMAIL_HOST=smtp.example.com
# EMAIL_PORT=587
# EMAIL_USE_TLS=True
# EMAIL_HOST_USER=your-email@example.com
# EMAIL_HOST_PASSWORD=your-password
```

**注意**: `.env`ファイルは機密情報を含むため、Gitにコミットしないでください（`.gitignore`に含まれています）。

### 10. データベースマイグレーション

```bash
# プロジェクトルートで実行
python manage.py migrate

# 管理者アカウントの作成（オプション）
python manage.py createsuperuser
```

## サーバー起動確認

### Djangoサーバーの起動

プロジェクトルートで以下のコマンドを実行：

```bash
# 仮想環境が有効化されていることを確認
source venv/bin/activate

# Djangoサーバーを起動（ポート8001）
python manage.py runserver 8001
```

ブラウザで `http://localhost:8001` にアクセスして、Djangoが正常に動作していることを確認してください。

### Reactサーバーの起動（別ターミナル）

新しいターミナルウィンドウを開き、以下のコマンドを実行：

```bash
cd frontend
npm start
```

ブラウザで `http://localhost:3000` にアクセスして、Reactアプリが正常に動作していることを確認してください。

## トラブルシューティング

### Python仮想環境の有効化ができない

```bash
# 仮想環境を再作成
rm -rf venv
python3 -m venv venv
source venv/bin/activate
```

### PostgreSQLが起動しない

```bash
# PostgreSQLサービスの状態を確認
brew services list

# 手動で起動
brew services start postgresql@14

# または、直接起動
pg_ctl -D /opt/homebrew/var/postgresql@14 start
```

### npm installでエラーが発生する

```bash
# node_modulesを削除して再インストール
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### マイグレーションエラー

```bash
# マイグレーションファイルを削除して再作成（注意：データが失われる可能性があります）
python manage.py migrate --run-syncdb
```

## 開発時の注意事項

1. **仮想環境の有効化**: 毎回新しいターミナルセッションで作業を開始する際は、`source venv/bin/activate`を実行してください。

2. **データベース**: 開発環境ではSQLiteを使用しています。本番環境ではPostgreSQLを使用することを推奨します。

3. **ポート番号**: 
   - Django: 8001
   - React: 3000（デフォルト）

4. **CORS設定**: `keyron_project/settings.py`でCORSの設定を確認してください。

## 自動セットアップスクリプトの使用

手動でのセットアップが面倒な場合は、提供されている自動セットアップスクリプトを使用できます：

```bash
./setup.sh
```

このスクリプトは以下の処理を自動化します：
- 必要なツール（Homebrew、Python、Git、Node.js、PostgreSQL）の確認とインストール
- Python仮想環境の作成
- 依存パッケージのインストール
- React環境の構築
- データベースマイグレーションの実行

**注意**: スクリプト実行中に確認を求められる場合があります。

## 次のステップ

環境構築が完了したら、以下を確認してください：

- [ ] Django管理画面にアクセスできる（`http://localhost:8001/admin`）
- [ ] Reactアプリが起動する（`http://localhost:3000`）
- [ ] APIエンドポイントにアクセスできる
- [ ] データベースマイグレーションが正常に完了している

## サポート

問題が発生した場合は、プロジェクトのIssueトラッカーで報告してください。

