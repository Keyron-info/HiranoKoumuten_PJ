# invoices/admin.py（一時的な簡易版）

from django.contrib import admin
from .models import Company, User, Invoice

# 基本的な登録のみ
admin.site.register(Company)
admin.site.register(User)
admin.site.register(Invoice)