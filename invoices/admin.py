# invoices/admin.py

from django.contrib import admin
from .models import (
    Company, Department, CustomerCompany, User, 
    ApprovalRoute, ApprovalStep, Invoice, InvoiceItem,
    ApprovalHistory, InvoiceComment, ConstructionSite,
    # タスク2追加
    UserRegistrationRequest,
    # タスク3追加
    PaymentCalendar,
    DeadlineNotificationBanner
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
# ==========================================
# Phase 2: Admin管理画面追加
# ==========================================
# backend/invoices/admin.py に追加してください

from django.contrib import admin
from .models import (
    InvoiceTemplate, TemplateField, MonthlyInvoicePeriod,
    CustomField, CustomFieldValue, PDFGenerationLog
)


# ==========================================
# 1. テンプレート管理
# ==========================================

class TemplateFieldInline(admin.TabularInline):
    """テンプレートフィールドのインライン表示"""
    model = TemplateField
    extra = 1
    fields = ['field_name', 'field_type', 'is_required', 'default_value', 'display_order']
    ordering = ['display_order']


@admin.register(InvoiceTemplate)
class InvoiceTemplateAdmin(admin.ModelAdmin):
    """請求書テンプレート管理"""
    list_display = ['name', 'company', 'is_active', 'is_default', 'created_at']
    list_filter = ['company', 'is_active', 'is_default']
    search_fields = ['name', 'description']
    readonly_fields = ['created_at', 'updated_at']
    inlines = [TemplateFieldInline]
    
    fieldsets = (
        ('基本情報', {
            'fields': ('name', 'company', 'description')
        }),
        ('設定', {
            'fields': ('is_active', 'is_default')
        }),
        ('システム情報', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(TemplateField)
class TemplateFieldAdmin(admin.ModelAdmin):
    """テンプレートフィールド管理"""
    list_display = ['template', 'field_name', 'field_type', 'is_required', 'display_order']
    list_filter = ['template', 'field_type', 'is_required']
    search_fields = ['field_name', 'template__name']
    list_editable = ['display_order']


# ==========================================
# 2. 月次請求期間管理
# ==========================================

@admin.register(MonthlyInvoicePeriod)
class MonthlyInvoicePeriodAdmin(admin.ModelAdmin):
    """月次請求期間管理"""
    list_display = [
        'period_name', 'company', 'deadline_date',
        'is_closed', 'closed_by', 'invoice_count'
    ]
    list_filter = ['company', 'is_closed', 'year']
    search_fields = ['company__name', 'notes']
    readonly_fields = ['closed_by', 'closed_at', 'created_at']
    date_hierarchy = 'deadline_date'
    
    fieldsets = (
        ('期間情報', {
            'fields': ('company', 'year', 'month', 'deadline_date')
        }),
        ('締め状態', {
            'fields': ('is_closed', 'closed_by', 'closed_at', 'notes')
        }),
        ('システム情報', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )
    
    def period_name(self, obj):
        return obj.period_name
    period_name.short_description = '期間'
    
    def invoice_count(self, obj):
        """この期間の請求書数"""
        return obj.invoices.count()
    invoice_count.short_description = '請求書数'
    
    actions = ['close_periods', 'reopen_periods']
    
    def close_periods(self, request, queryset):
        """一括締め処理"""
        for period in queryset.filter(is_closed=False):
            period.close_period(request.user)
        self.message_user(request, f'{queryset.count()}件の期間を締めました')
    close_periods.short_description = '選択した期間を締める'
    
    def reopen_periods(self, request, queryset):
        """一括再開処理"""
        for period in queryset.filter(is_closed=True):
            period.reopen_period()
        self.message_user(request, f'{queryset.count()}件の期間を再開しました')
    reopen_periods.short_description = '選択した期間を再開する'


# ==========================================
# 3. カスタムフィールド管理
# ==========================================

@admin.register(CustomField)
class CustomFieldAdmin(admin.ModelAdmin):
    """カスタムフィールド管理"""
    list_display = ['field_name', 'company', 'field_type', 'is_required', 'is_active', 'display_order']
    list_filter = ['company', 'field_type', 'is_required', 'is_active']
    search_fields = ['field_name', 'help_text']
    list_editable = ['is_active', 'display_order']


@admin.register(CustomFieldValue)
class CustomFieldValueAdmin(admin.ModelAdmin):
    """カスタムフィールド値管理"""
    list_display = ['invoice', 'custom_field', 'value']
    list_filter = ['custom_field']
    search_fields = ['invoice__invoice_number', 'value']


# ==========================================
# 4. PDF生成履歴
# ==========================================

@admin.register(PDFGenerationLog)
class PDFGenerationLogAdmin(admin.ModelAdmin):
    """PDF生成履歴管理"""
    list_display = ['invoice', 'generated_by', 'generated_at', 'file_size_kb']
    list_filter = ['generated_at']
    search_fields = ['invoice__invoice_number', 'generated_by__username']
    readonly_fields = ['invoice', 'generated_by', 'generated_at', 'file_size']
    date_hierarchy = 'generated_at'
    
    def file_size_kb(self, obj):
        """ファイルサイズをKB表示"""
        if obj.file_size:
            return f"{obj.file_size / 1024:.1f} KB"
        return "-"
    file_size_kb.short_description = 'サイズ'
    
    def has_add_permission(self, request):
        """追加不可"""
        return False
    
    def has_change_permission(self, request, obj=None):
        """編集不可"""
        return False


# ==========================================
# タスク2: ユーザー登録申請管理
# ==========================================

@admin.register(UserRegistrationRequest)
class UserRegistrationRequestAdmin(admin.ModelAdmin):
    """ユーザー登録申請管理"""
    list_display = [
        'company_name', 'full_name', 'email', 'status',
        'submitted_at', 'reviewed_at', 'reviewed_by'
    ]
    list_filter = ['status', 'submitted_at', 'reviewed_at']
    search_fields = ['company_name', 'full_name', 'email']
    readonly_fields = ['submitted_at', 'reviewed_at', 'reviewed_by', 'created_user']
    date_hierarchy = 'submitted_at'
    
    fieldsets = (
        ('申請者情報', {
            'fields': ('company_name', 'full_name', 'email', 'phone_number',
                      'postal_code', 'address', 'department', 'position', 'notes')
        }),
        ('承認管理', {
            'fields': ('status', 'submitted_at', 'reviewed_at', 'reviewed_by',
                      'rejection_reason', 'created_user')
        }),
    )


# ==========================================
# タスク3: 支払いカレンダー・締め日管理
# ==========================================

@admin.register(PaymentCalendar)
class PaymentCalendarAdmin(admin.ModelAdmin):
    """支払いカレンダー管理"""
    list_display = [
        'year', 'month', 'deadline_date', 'payment_date',
        'is_non_standard_deadline', 'is_holiday_period', 'created_at'
    ]
    list_filter = ['year', 'is_holiday_period']
    search_fields = ['holiday_note']
    readonly_fields = ['is_non_standard_deadline', 'created_at', 'updated_at']
    date_hierarchy = 'deadline_date'
    
    fieldsets = (
        ('基本情報', {
            'fields': ('year', 'month', 'deadline_date', 'payment_date')
        }),
        ('休暇期間', {
            'fields': ('is_holiday_period', 'holiday_note')
        }),
        ('システム情報', {
            'fields': ('is_non_standard_deadline', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(DeadlineNotificationBanner)
class DeadlineNotificationBannerAdmin(admin.ModelAdmin):
    """締め日変更バナー管理"""
    list_display = [
        'target_year', 'target_month', 'period_name',
        'is_active', 'created_by', 'created_at'
    ]
    list_filter = ['is_active', 'target_year', 'target_month']
    search_fields = ['period_name', 'custom_message']
    readonly_fields = ['display_message', 'created_at', 'updated_at', 'created_by']
    
    fieldsets = (
        ('基本情報', {
            'fields': ('target_year', 'target_month', 'is_active')
        }),
        ('メッセージ設定', {
            'fields': ('period_name', 'message_template', 'custom_message'),
            'description': 'カスタムメッセージを指定した場合、テンプレートより優先されます。'
        }),
        ('プレビュー', {
            'fields': ('display_message',),
            'classes': ('collapse',)
        }),
        ('システム情報', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def display_message(self, obj):
        """表示メッセージのプレビュー"""
        return obj.get_display_message()
    display_message.short_description = '表示メッセージ'
    
    def save_model(self, request, obj, form, change):
        """保存時に作成者を自動設定"""
        if not change:  # 新規作成時
            obj.created_by = request.user
        super().save_model(request, obj, form, change)