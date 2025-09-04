# invoices/urls.py

from django.urls import path
from . import views

urlpatterns = [
    path('', views.invoice_list, name='invoice_list'),
    path('upload/', views.upload_invoice, name='upload_invoice'),
    path('detail/<int:invoice_id>/', views.invoice_detail, name='invoice_detail'),
]