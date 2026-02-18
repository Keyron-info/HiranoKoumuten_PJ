# invoices/jwt_serializers.py

from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.exceptions import AuthenticationFailed
from django.contrib.auth import authenticate, get_user_model
from django.utils.translation import gettext_lazy as _

User = get_user_model()


class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    メールアドレスベースの認証用カスタムシリアライザー
    フロントエンドから { email, password } を受け取り認証する
    """
    username_field = 'email'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # 'username' フィールドを 'email' フィールドに置き換える
        # 親クラスが username_field を使ってフィールドを定義するため、
        # 明示的に email フィールドを確認する
        if 'username' in self.fields and 'email' not in self.fields:
            self.fields['email'] = self.fields.pop('username')

    def validate(self, attrs):
        # email と password を取得
        email = attrs.get('email') or attrs.get(self.username_field)
        password = attrs.get('password')

        if not email or not password:
            raise AuthenticationFailed(
                _('メールアドレスとパスワードを入力してください。'),
                'no_active_account'
            )

        # メールアドレスでユーザーを検索
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            raise AuthenticationFailed(
                _('メールアドレスまたはパスワードが正しくありません。'),
                'no_active_account'
            )
        except User.MultipleObjectsReturned:
            raise AuthenticationFailed(
                _('このメールアドレスに複数のアカウントが存在します。管理者にお問い合わせください。'),
                'no_active_account'
            )

        # パスワード確認
        if not user.check_password(password):
            raise AuthenticationFailed(
                _('メールアドレスまたはパスワードが正しくありません。'),
                'no_active_account'
            )

        # アクティブ確認
        if not user.is_active:
            raise AuthenticationFailed(
                _('このアカウントは無効化されています。管理者にお問い合わせください。'),
                'no_active_account'
            )

        # is_active_user フィールドも確認（カスタムフィールド）
        if hasattr(user, 'is_active_user') and not user.is_active_user:
            raise AuthenticationFailed(
                _('このアカウントは現在利用できません。管理者にお問い合わせください。'),
                'no_active_account'
            )

        # トークン生成のために attrs に user を設定
        # 親クラスの get_token を呼び出すために必要
        data = {}
        refresh = self.get_token(user)
        data['refresh'] = str(refresh)
        data['access'] = str(refresh.access_token)

        return data
