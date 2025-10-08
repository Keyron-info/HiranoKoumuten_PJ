# keyron_project/urls.py

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # API エンドポイント
    path('api/', include('invoices.api_urls')),
    
    # 既存のHTMLページ（後方互換性のため残す）
    path('invoices/', include('invoices.urls')),
]

# 開発環境でのメディアファイル配信
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)