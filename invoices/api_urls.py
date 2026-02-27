# invoices/api_urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .api_views import (
    UserRegistrationViewSet,
    UserProfileViewSet,
    CustomerCompanyViewSet,
    CompanyViewSet,
    ConstructionSiteViewSet,
    InvoiceViewSet,
    DashboardViewSet,
    InvoiceTemplateViewSet,
    TemplateFieldViewSet,
    MonthlyInvoicePeriodViewSet,
    CustomFieldViewSet,
    # Phase 3追加
    ConstructionTypeViewSet,
    PurchaseOrderViewSet,
    SystemNotificationViewSet,
    AccessLogViewSet,
    BatchApprovalScheduleViewSet,
    ReportViewSet,
    # Phase 4追加（データベース設計書準拠）
    ConstructionTypeUsageViewSet,
    BudgetViewSet,
    SafetyFeeModelViewSet,
    FileAttachmentViewSet,
    InvoiceApprovalWorkflowViewSet,
    DepartmentViewSet,
    # Phase 5追加（追加要件）
    InvoiceCorrectionViewSet,
    # Phase 6追加（追加機能）
    CSVExportViewSet,
    ChartDataViewSet,
    AuditLogViewSet,
    DocumentTypeViewSet,
    MonthlyClosingViewSet,
    SafetyFeeViewSet,
    AmountVerificationViewSet,
    BudgetAlertViewSet,
    CommentMentionViewSet,
    # タスク2追加
    UserRegistrationRequestViewSet,
    # タスク3追加
    PaymentCalendarViewSet,
    DeadlineNotificationBannerViewSet,
    PasswordResetView,
    PasswordResetConfirmView,
    # 支払い表
    PaymentReportViewSet,
)

router = DefaultRouter()
router.register(r'customer-companies', CustomerCompanyViewSet, basename='customer-company')
router.register(r'companies', CompanyViewSet, basename='company')
router.register(r'construction-sites', ConstructionSiteViewSet, basename='construction-site')
router.register(r'invoices', InvoiceViewSet, basename='invoice')
router.register(r'dashboard', DashboardViewSet, basename='dashboard')
router.register(r'users', UserProfileViewSet, basename='user')
router.register(r'templates', InvoiceTemplateViewSet, basename='template')
router.register(r'template-fields', TemplateFieldViewSet, basename='template-field')
router.register(r'invoice-periods', MonthlyInvoicePeriodViewSet, basename='invoice-period')
router.register(r'custom-fields', CustomFieldViewSet, basename='custom-field')
# Phase 3追加
router.register(r'construction-types', ConstructionTypeViewSet, basename='construction-type')
router.register(r'purchase-orders', PurchaseOrderViewSet, basename='purchase-order')
router.register(r'notifications', SystemNotificationViewSet, basename='notification')
router.register(r'access-logs', AccessLogViewSet, basename='access-log')
router.register(r'batch-approvals', BatchApprovalScheduleViewSet, basename='batch-approval')
router.register(r'reports', ReportViewSet, basename='report')
# Phase 4追加（データベース設計書準拠）
router.register(r'construction-type-usages', ConstructionTypeUsageViewSet, basename='construction-type-usage')
router.register(r'budgets', BudgetViewSet, basename='budget')
router.register(r'safety-fees', SafetyFeeModelViewSet, basename='safety-fee')
router.register(r'file-attachments', FileAttachmentViewSet, basename='file-attachment')
router.register(r'approval-workflows', InvoiceApprovalWorkflowViewSet, basename='approval-workflow')
router.register(r'departments', DepartmentViewSet, basename='department')
# Phase 5追加（追加要件）
router.register(r'invoice-corrections', InvoiceCorrectionViewSet, basename='invoice-correction')
# Phase 6追加（追加機能）
router.register(r'csv-export', CSVExportViewSet, basename='csv-export')
router.register(r'chart-data', ChartDataViewSet, basename='chart-data')
router.register(r'audit-logs', AuditLogViewSet, basename='audit-log')
router.register(r'document-types', DocumentTypeViewSet, basename='document-type')
router.register(r'monthly-closing', MonthlyClosingViewSet, basename='monthly-closing')
router.register(r'safety-fee', SafetyFeeViewSet, basename='safety-fee-calc')
router.register(r'amount-verification', AmountVerificationViewSet, basename='amount-verification')
router.register(r'budget-alerts', BudgetAlertViewSet, basename='budget-alert')
router.register(r'comment-mentions', CommentMentionViewSet, basename='comment-mention')
# タスク2追加
router.register(r'user-registration-requests', UserRegistrationRequestViewSet, basename='user-registration-request')
# タスク3追加
router.register(r'payment-calendar', PaymentCalendarViewSet, basename='payment-calendar')
router.register(r'deadline-banner', DeadlineNotificationBannerViewSet, basename='deadline-banner')
# 支払い表
router.register(r'payment-report', PaymentReportViewSet, basename='payment-report')

urlpatterns = [
    # JWT認証
    path('auth/login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # ユーザー登録（旧エンドポイント - 互換性のため残す）
    path('auth/register/', UserRegistrationViewSet.as_view({'post': 'register'}), name='register'),

    # パスワードリセット
    path('auth/password-reset/', PasswordResetView.as_view(), name='password_reset'),
    path('auth/password-reset/confirm/', PasswordResetConfirmView.as_view(), name='password_reset_confirm'),
    # タスク2: 新規ユーザー登録申請
    path('users/register/', UserRegistrationRequestViewSet.as_view({'post': 'register'}), name='user-register'),
    
    # Router URLs
    path('', include(router.urls)),
]