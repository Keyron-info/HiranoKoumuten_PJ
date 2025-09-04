# keyron_project/urls.py

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.shortcuts import redirect

def home_redirect(request):
    """ルートURLを請求書一覧にリダイレクト"""
    return redirect('invoice_list')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', home_redirect, name='home'),  # ルートURLを追加
    path('invoices/', include('invoices.urls')),
    path('accounts/', include('django.contrib.auth.urls')),
]

# メディアファイルの設定（開発環境用）
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)