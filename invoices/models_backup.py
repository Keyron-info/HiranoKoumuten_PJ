from django.db import models
from django.contrib.auth.models import AbstractUser
from django.conf import settings
import uuid
from datetime import datetime, timedelta

# カスタムユーザーモデル
class User(AbstractUser):
    USER_TYPES = (
        ('internal', '社内ユーザー'),
        ('customer', '顧客'),
    )
    ROLES = (
        ('admin', '管理者'),
        ('manager', '承認者'),
        ('accountant', '経理担当者'),
        ('field_staff', '現場担当者'),
        ('customer', '顧客'),
    )
    
    user_type = models.CharField(max_length=20, choices=USER_TYPES, default='internal')
    role = models.CharField(max_length=20, choices=ROLES, default='field_staff')
    company_name = models.CharField(max_length=200, blank=True)
    department = models.CharField(max_length=100, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

# 会社・組織
class Company(models.Model):
    name = models.CharField(max_length=200)
    address = models.TextField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    is_customer = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name
    # 請求書モデル
class Invoice(models.Model):
    STATUSES = (
        ('pending', '未処理'),
        ('received', '受付済'),
        ('approval_requested', '承認依頼中'),
        ('approved', '承認済み'),
        ('rejected', '差し戻し'),
        ('payment_ready', '支払い準備中'),
        ('paid', '支払い済み'),
    )
    
    invoice_number = models.CharField(max_length=100, unique=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    issue_date = models.DateField()
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='invoices')
    submitted_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='submitted_invoices')
    status = models.CharField(max_length=20, choices=STATUSES, default='pending')
    unique_url = models.UUIDField(default=uuid.uuid4, unique=True)
    file = models.FileField(upload_to='invoices/', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.invoice_number} - {self.company.name}"

# 承認プロセス
class Approval(models.Model):
    ACTIONS = (
        ('pending', '保留中'),
        ('approved', '承認'),
        ('rejected', '却下'),
        ('returned', '差し戻し'),
    )
    
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='approvals')
    approver = models.ForeignKey(User, on_delete=models.CASCADE)
    action = models.CharField(max_length=20, choices=ACTIONS, default='pending')
    comment = models.TextField(blank=True)
    approved_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

# コメント機能
class InvoiceComment(models.Model):
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='comments')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)