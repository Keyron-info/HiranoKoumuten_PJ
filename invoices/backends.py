# invoices/backends.py

from django.contrib.auth.backends import ModelBackend
from django.contrib.auth import get_user_model

User = get_user_model()


class CustomAuthBackend(ModelBackend):
    """カスタム認証バックエンド"""
    
    def authenticate(self, request, username=None, password=None, **kwargs):
        if username is None or password is None:
            return None
        
        try:
            user = User.objects.get(username=username)
            if user.check_password(password) and self.user_can_authenticate(user):
                return user
        except User.DoesNotExist:
            User().set_password(password)
        
        return None