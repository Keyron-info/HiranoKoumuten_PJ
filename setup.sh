#!/bin/bash

# 平野工務店プロジェクト - 環境構築スクリプト
# このスクリプトは、開発環境のセットアップを自動化します。

set -e  # エラーが発生したらスクリプトを停止

echo "=========================================="
echo "平野工務店プロジェクト - 環境構築スクリプト"
echo "=========================================="
echo ""

# 色の定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# エラーメッセージ関数
error() {
    echo -e "${RED}エラー: $1${NC}" >&2
    exit 1
}

# 成功メッセージ関数
success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# 警告メッセージ関数
warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# 情報メッセージ関数
info() {
    echo -e "${NC}ℹ $1${NC}"
}

# Homebrewの確認
echo "1. Homebrewの確認中..."
if ! command -v brew &> /dev/null; then
    warning "Homebrewがインストールされていません。"
    read -p "Homebrewをインストールしますか？ (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        # Homebrewのパスを設定
        if [ -f "/opt/homebrew/bin/brew" ]; then
            eval "$(/opt/homebrew/bin/brew shellenv)"
        fi
    else
        error "Homebrewが必要です。インストールをキャンセルしました。"
    fi
else
    success "Homebrewは既にインストールされています"
fi

# Python 3.13の確認
echo ""
echo "2. Python 3.13の確認中..."
if ! command -v python3 &> /dev/null; then
    info "Python 3.13をインストールします..."
    brew install python@3.13
else
    PYTHON_VERSION=$(python3 --version | cut -d' ' -f2 | cut -d'.' -f1,2)
    if [[ "$PYTHON_VERSION" == "3.13" ]]; then
        success "Python 3.13は既にインストールされています"
    else
        warning "Python 3.13が推奨されていますが、現在のバージョンは $PYTHON_VERSION です"
        read -p "Python 3.13をインストールしますか？ (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            brew install python@3.13
        fi
    fi
fi

# Gitの確認
echo ""
echo "3. Gitの確認中..."
if ! command -v git &> /dev/null; then
    info "Gitをインストールします..."
    brew install git
else
    success "Gitは既にインストールされています"
fi

# Node.js & npmの確認
echo ""
echo "4. Node.js & npmの確認中..."
if ! command -v node &> /dev/null; then
    info "Node.jsをインストールします..."
    brew install node
else
    success "Node.jsは既にインストールされています ($(node --version))"
fi

if ! command -v npm &> /dev/null; then
    error "npmが見つかりません"
else
    success "npmは既にインストールされています ($(npm --version))"
fi

# PostgreSQLの確認
echo ""
echo "5. PostgreSQLの確認中..."
if ! command -v psql &> /dev/null; then
    info "PostgreSQL 14をインストールします..."
    brew install postgresql@14
    brew services start postgresql@14
    success "PostgreSQL 14をインストールし、起動しました"
else
    success "PostgreSQLは既にインストールされています"
    # PostgreSQLサービスの起動確認
    if brew services list | grep -q "postgresql@14.*started"; then
        success "PostgreSQLサービスは起動しています"
    else
        warning "PostgreSQLサービスを起動します..."
        brew services start postgresql@14 || true
    fi
fi

# プロジェクトディレクトリの確認
echo ""
echo "6. プロジェクトディレクトリの確認中..."
if [ ! -f "manage.py" ]; then
    error "manage.pyが見つかりません。プロジェクトルートでこのスクリプトを実行してください。"
fi
success "プロジェクトディレクトリを確認しました"

# Python仮想環境の作成
echo ""
echo "7. Python仮想環境の作成中..."
if [ -d "venv" ]; then
    warning "仮想環境は既に存在します"
    read -p "仮想環境を再作成しますか？ (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -rf venv
        python3 -m venv venv
        success "仮想環境を再作成しました"
    else
        success "既存の仮想環境を使用します"
    fi
else
    python3 -m venv venv
    success "仮想環境を作成しました"
fi

# 仮想環境の有効化
echo ""
echo "8. 依存パッケージのインストール中..."
source venv/bin/activate
pip install --upgrade pip --quiet
pip install -r requirements.txt --quiet
success "依存パッケージをインストールしました"

# React環境の構築
echo ""
echo "9. React環境の構築中..."
if [ ! -d "frontend" ]; then
    error "frontendディレクトリが見つかりません"
fi

cd frontend
if [ -d "node_modules" ]; then
    warning "node_modulesは既に存在します"
    read -p "node_modulesを再インストールしますか？ (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -rf node_modules package-lock.json
        npm install
        success "node_modulesを再インストールしました"
    else
        success "既存のnode_modulesを使用します"
    fi
else
    npm install
    success "React依存パッケージをインストールしました"
fi
cd ..

# .envファイルの確認
echo ""
echo "10. 環境変数ファイルの確認中..."
if [ ! -f ".env" ]; then
    warning ".envファイルが存在しません"
    info ".env.exampleを参考に.envファイルを作成してください"
    if [ -f ".env.example" ]; then
        read -p ".env.exampleをコピーして.envファイルを作成しますか？ (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            cp .env.example .env
            warning ".envファイルを作成しました。必要に応じて編集してください。"
        fi
    fi
else
    success ".envファイルが存在します"
fi

# データベースマイグレーション
echo ""
echo "11. データベースマイグレーションの実行中..."
python manage.py migrate
success "データベースマイグレーションを完了しました"

# 完了メッセージ
echo ""
echo "=========================================="
echo -e "${GREEN}環境構築が完了しました！${NC}"
echo "=========================================="
echo ""
echo "次のステップ:"
echo "1. 仮想環境を有効化: source venv/bin/activate"
echo "2. Djangoサーバーを起動: python manage.py runserver 8001"
echo "3. 別ターミナルでReactサーバーを起動: cd frontend && npm start"
echo ""
echo "管理者アカウントを作成する場合:"
echo "  python manage.py createsuperuser"
echo ""

