# invoices/admin.py

from django.contrib import admin
from .models import (
    Company, Department, CustomerCompany, User, 
    ApprovalRoute, ApprovalStep, Invoice, InvoiceItem,
    ApprovalHistory, InvoiceComment, ConstructionSite
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

@admin.register(ConstructionSite)
class ConstructionSiteAdmin(admin.ModelAdmin):
    list_display = ['name', 'company', 'supervisor', 'location', 'is_active', 'created_at']
    list_filter = ['company', 'is_active', 'created_at']
    search_fields = ['name', 'location']

@admin.register(ApprovalRoute)
class ApprovalRouteAdmin(admin.ModelAdmin):
    list_display = ['name', 'company', 'is_default', 'is_active']
    list_filter = ['company', 'is_active', 'is_default']

@admin.register(ApprovalStep)
class ApprovalStepAdmin(admin.ModelAdmin):
    list_display = ['route', 'step_order', 'step_name', 'approver_position', 'approver_user']
    list_filter = ['route']
    ordering = ['route', 'step_order']

@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = [
        'invoice_number', 
        'customer_company', 
        'total_amount',
        'status', 
        'current_approver',
        'created_at'
    ]
    list_filter = ['status', 'created_at', 'customer_company']
    search_fields = ['invoice_number', 'unique_number', 'project_name']
    readonly_fields = ['unique_url', 'unique_number', 'invoice_number', 'subtotal', 'tax_amount', 'total_amount']

@admin.register(InvoiceItem)
class InvoiceItemAdmin(admin.ModelAdmin):
    list_display = ['invoice', 'item_number', 'description', 'quantity', 'unit', 'unit_price', 'amount']
    list_filter = ['invoice']
    search_fields = ['description']

@admin.register(ApprovalHistory)
class ApprovalHistoryAdmin(admin.ModelAdmin):
    list_display = ['invoice', 'user', 'action', 'timestamp']
    list_filter = ['action', 'timestamp']

@admin.register(InvoiceComment)
class InvoiceCommentAdmin(admin.ModelAdmin):
    list_display = ['invoice', 'user', 'comment_type', 'timestamp']
    list_filter = ['comment_type', 'timestamp', 'is_private']
