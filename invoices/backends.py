# invoices/backends.py

from django.contrib.auth.backends import ModelBackend
from django.contrib.auth import get_user_model
from django.db.models import Q

User = get_user_model()


class CustomAuthBackend(ModelBackend):
    """カスタム認証バックエンド - ユーザー名またはメールアドレスでログイン可能"""
    
    def authenticate(self, request, username=None, password=None, **kwargs):
        if username is None or password is None:
            return None
        
        try:
            # ユーザー名またはメールアドレスで検索
            user = User.objects.get(Q(username=username) | Q(email=username))
            if user.check_password(password) and self.user_can_authenticate(user):
                return user
        except User.DoesNotExist:
            # タイミング攻撃を防ぐためにパスワードハッシュを実行
            User().set_password(password)
        except User.MultipleObjectsReturned:
            # 複数ユーザーが見つかった場合はusernameで優先検索
            try:
                user = User.objects.get(username=username)
                if user.check_password(password) and self.user_can_authenticate(user):
                    return user
            except User.DoesNotExist:
                pass
        
        return None
