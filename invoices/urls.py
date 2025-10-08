# invoices/urls.py - 完全版（このファイル全体を置き換えてください）

from django.urls import path
from . import views

urlpatterns = [
    # 基本的なページ
    path('', views.invoice_list, name='invoice_list'),
    path('dashboard/', views.dashboard, name='dashboard'),
    path('upload/', views.upload_invoice, name='upload_invoice'),
    
    # 請求書詳細（IDベース）
    path('detail/<int:invoice_id>/', views.invoice_detail, name='invoice_detail'),
    
    # 承認関連（IDベース）
    path('approve/<int:invoice_id>/', views.approve_invoice, name='approve_invoice'),
    path('reject/<int:invoice_id>/', views.reject_invoice, name='reject_invoice'),
    path('return/<int:invoice_id>/', views.return_invoice, name='return_invoice'),
    
    # コメント追加（IDベース）
    path('comment/<int:invoice_id>/', views.add_comment, name='add_comment'),
    
    # デバッグ用
    path('debug/', views.debug_invoices, name='debug_invoices'),
    path('debug/create-test/', views.create_test_data, name='create_test_data'),
]