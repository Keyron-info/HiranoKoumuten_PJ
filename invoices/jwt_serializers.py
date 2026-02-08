# invoices/serializers.py (カスタムJWTシリアライザー追加)

from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model

User = get_user_model()

class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    メールアドレスベースの認証用カスタムシリアライザー
    """
    username_field = User.USERNAME_FIELD  # 'email'を使用
