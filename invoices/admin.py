from django.contrib import admin
from .models import (
    Company, Department, CustomerCompany, User, 
    ApprovalRoute, ApprovalStep, Invoice, 
    ApprovalHistory, InvoiceComment
)

@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ['name', 'email', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name']

@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ['name', 'company', 'code', 'is_active']
    list_filter = ['company', 'is_active']
    search_fields = ['name', 'code']

@admin.register(CustomerCompany)
class CustomerCompanyAdmin(admin.ModelAdmin):
    list_display = ['name', 'business_type', 'email', 'is_active']
    list_filter = ['business_type', 'is_active']
    search_fields = ['name']

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ['username', 'email', 'user_type', 'company', 'position']
    list_filter = ['user_type', 'position', 'is_active']
    search_fields = ['username', 'email']

@admin.register(ApprovalRoute)
class ApprovalRouteAdmin(admin.ModelAdmin):
    list_display = ['name', 'company', 'is_active']
    list_filter = ['company', 'is_active']

@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ['invoice_number', 'customer_company', 'amount', 'status', 'created_at']
    list_filter = ['status', 'created_at', 'customer_company']
    search_fields = ['invoice_number', 'unique_number']
    readonly_fields = ['unique_url', 'unique_number']

@admin.register(ApprovalHistory)
class ApprovalHistoryAdmin(admin.ModelAdmin):
    list_display = ['invoice', 'user', 'action', 'timestamp']
    list_filter = ['action', 'timestamp']

@admin.register(InvoiceComment)
class InvoiceCommentAdmin(admin.ModelAdmin):
    list_display = ['invoice', 'user', 'comment_type', 'timestamp']
    list_filter = ['comment_type', 'timestamp', 'is_private']