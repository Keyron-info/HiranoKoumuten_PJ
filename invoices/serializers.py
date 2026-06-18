# invoices/serializers.py

from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.utils import timezone
from .models import (
    Company, Department, CustomerCompany, User,
    Invoice, ApprovalRoute, ApprovalStep,
    ApprovalHistory, InvoiceComment, ConstructionSite, InvoiceItem,
    # Phase 2追加
    InvoiceTemplate, TemplateField, MonthlyInvoicePeriod,
    CustomField, CustomFieldValue, PDFGenerationLog,
    # Phase 3追加（新要件）
    ConstructionType, PurchaseOrder, PurchaseOrderItem,
    InvoiceChangeHistory, AccessLog, SystemNotification, BatchApprovalSchedule,
    # Phase 4追加（データベース設計書準拠）
    ConstructionTypeUsage, Budget, SafetyFee, FileAttachment,
    InvoiceApprovalWorkflow, InvoiceApprovalStep,
    # Phase 5追加（追加要件）
    InvoiceCorrection,
    # タスク2追加
    UserRegistrationRequest,
    # タスク3追加
    PaymentCalendar,
    DeadlineNotificationBanner,
    # Phase 6追加
    AuditLog
)

User = get_user_model()


# ==========================================
# Phase 1: 既存シリアライザー
# ==========================================

class CompanySerializer(serializers.ModelSerializer):
    company_type_display = serializers.CharField(source='get_company_type_display', read_only=True)
    
    class Meta:
        model = Company
        fields = [
            'id', 'name', 'name_kana', 
            'company_type', 'company_type_display',
            'representative_name',
            'postal_code', 'address', 'phone', 'email', 'tax_number',
            'bank_name', 'bank_branch', 'bank_account_type', 
            'bank_account_number', 'bank_account_holder',
            'contract_start_date',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class DepartmentSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source='company.name', read_only=True)
    parent_department_name = serializers.CharField(source='parent_department.name', read_only=True, allow_null=True)
    
    class Meta:
        model = Department
        fields = [
            'id', 'company', 'company_name', 'name', 'code', 'manager_name',
            'parent_department', 'parent_department_name',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class CustomerCompanySerializer(serializers.ModelSerializer):
    business_type_display = serializers.CharField(source='get_business_type_display', read_only=True)
    
    class Meta:
        model = CustomerCompany
        fields = [
            'id', 'name', 'name_kana', 'business_type', 'business_type_display',
            'representative_name', 'invoice_registration_number',
            'postal_code', 'address', 'phone', 'fax', 'email',
            'head_office_postal_code', 'head_office_address',
            'tax_number', 'bank_name', 'bank_branch', 'bank_account', 'is_active'
        ]


class UserSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source='company.name', read_only=True)
    customer_company_name = serializers.CharField(source='customer_company.name', read_only=True)
    position_display = serializers.CharField(source='get_position_display', read_only=True)
    user_type_display = serializers.CharField(source='get_user_type_display', read_only=True)
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'user_type', 'user_type_display', 'position', 'position_display',
            'company', 'company_name', 'department',
            'customer_company', 'customer_company_name',
            'phone', 'is_active', 'is_active_user', 'date_joined'
        ]
        read_only_fields = ['id', 'date_joined']


class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = [
            'username', 'email', 'password', 'password_confirm',
            'first_name', 'last_name', 'user_type',
            'customer_company', 'phone'
        ]
    
    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError("パスワードが一致しません")
        return data
    
    def create(self, validated_data):
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        user = User.objects.create_user(**validated_data)
        user.set_password(password)
        user.save()
        return user


class ApprovalStepSerializer(serializers.ModelSerializer):
    approver_name = serializers.SerializerMethodField()
    position_display = serializers.CharField(source='get_approver_position_display', read_only=True)
    
    class Meta:
        model = ApprovalStep
        fields = [
            'id', 'route', 'step_order', 'step_name',
            'approver_position', 'position_display',
            'approver_user', 'approver_name',
            'is_required', 'timeout_days'
        ]
    
    def get_approver_name(self, obj):
        if obj.approver_user:
            return obj.approver_user.get_full_name()
        return '(工事現場から自動割り当て)'


class ApprovalRouteSerializer(serializers.ModelSerializer):
    steps = ApprovalStepSerializer(many=True, read_only=True)
    company_name = serializers.CharField(source='company.name', read_only=True)
    
    class Meta:
        model = ApprovalRoute
        fields = ['id', 'company', 'company_name', 'name', 'description', 'is_active', 'is_default', 'steps']


class InvoiceCommentSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    user_position = serializers.CharField(source='user.get_position_display', read_only=True)
    comment_type_display = serializers.CharField(source='get_comment_type_display', read_only=True)
    mentioned_usernames = serializers.SerializerMethodField()
    replies = serializers.SerializerMethodField()
    is_reply = serializers.SerializerMethodField()
    
    class Meta:
        model = InvoiceComment
        fields = [
            'id', 'invoice', 'user', 'user_name', 'user_position',
            'parent_comment', 'is_reply',
            'comment_type', 'comment_type_display',
            'comment', 'is_private', 'timestamp', 'updated_at',
            'mentioned_usernames', 'replies'
        ]
        read_only_fields = ['id', 'user', 'timestamp', 'updated_at']
    
    def get_mentioned_usernames(self, obj):
        return [u.username for u in obj.mentioned_users.all()]
    
    def get_replies(self, obj):
        """直接の返信コメントを取得"""
        # 再帰を防ぐため、1レベルのみ
        if obj.parent_comment is None:  # ルートコメントのみ返信を取得
            replies = obj.replies.all()
            return InvoiceCommentSerializer(replies, many=True, context=self.context).data
        return []
    
    def get_is_reply(self, obj):
        return obj.parent_comment is not None


class ApprovalHistorySerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    user_position = serializers.CharField(source='user.get_position_display', read_only=True)
    action_display = serializers.CharField(source='get_action_display', read_only=True)
    step_name = serializers.CharField(source='approval_step.step_name', read_only=True, allow_null=True)
    
    class Meta:
        model = ApprovalHistory
        fields = [
            'id', 'invoice', 'approval_step', 'step_name',
            'user', 'user_name', 'user_position',
            'action', 'action_display',
            'comment', 'timestamp'
        ]
        read_only_fields = ['id', 'user', 'timestamp']


class ConstructionSiteSerializer(serializers.ModelSerializer):
    """工事現場シリアライザー"""
    company_name = serializers.CharField(source='company.name', read_only=True)
    supervisor_name = serializers.CharField(source='supervisor.get_full_name', read_only=True, allow_null=True)
    construction_type_name = serializers.CharField(source='construction_type.name', read_only=True, allow_null=True)
    
    class Meta:
        model = ConstructionSite
        fields = [
            'id', 'project_code', 'name', 'location',
            'site_password',
            'special_access_password', 'special_access_expiry',
            'construction_type', 'construction_type_name',
            'company', 'company_name',
            'client_name', 'prime_contractor',
            'supervisor', 'supervisor_name',
            'start_date', 'end_date',
            'total_budget',
            'is_active', 'is_completed', 'completion_date',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'project_code', 'company', 'created_at', 'updated_at']


class InvoiceItemSerializer(serializers.ModelSerializer):
    """請求明細シリアライザー"""
    
    class Meta:
        model = InvoiceItem
        fields = [
            'id', 'item_number', 'description', 
            'quantity', 'unit', 'unit_price', 'amount'
        ]
        read_only_fields = ['id', 'amount']


# ==========================================
# Phase 2: 新規シリアライザー
# ==========================================

class TemplateFieldSerializer(serializers.ModelSerializer):
    """テンプレートフィールドシリアライザー"""
    
    class Meta:
        model = TemplateField
        fields = [
            'id', 'field_name', 'field_type', 'is_required',
            'default_value', 'display_order', 'help_text', 'choices'
        ]


class InvoiceTemplateSerializer(serializers.ModelSerializer):
    """請求書テンプレートシリアライザー"""
    fields = TemplateFieldSerializer(many=True, read_only=True)
    company_name = serializers.CharField(source='company.name', read_only=True)
    
    class Meta:
        model = InvoiceTemplate
        fields = [
            'id', 'name', 'company', 'company_name', 'description',
            'is_active', 'is_default', 'fields', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class InvoiceTemplateListSerializer(serializers.ModelSerializer):
    """テンプレート一覧用（軽量版）"""
    company_name = serializers.CharField(source='company.name', read_only=True)
    field_count = serializers.SerializerMethodField()
    
    class Meta:
        model = InvoiceTemplate
        fields = [
            'id', 'name', 'company_name', 'is_active', 'is_default',
            'field_count', 'created_at'
        ]
    
    def get_field_count(self, obj):
        return obj.fields.count()


class MonthlyInvoicePeriodSerializer(serializers.ModelSerializer):
    """月次請求期間シリアライザー"""
    company_name = serializers.CharField(source='company.name', read_only=True)
    closed_by_name = serializers.CharField(source='closed_by.get_full_name', read_only=True, allow_null=True)
    period_name = serializers.CharField(read_only=True)
    is_past_deadline = serializers.BooleanField(read_only=True)

    # フロントが使う start_date / end_date を確実に返す
    # period_start_date / period_end_date が null の場合は year/month から自動計算
    start_date = serializers.SerializerMethodField()
    end_date = serializers.SerializerMethodField()

    # 提出受付状態（受付ルール: 当月26日〜月末）
    submission_status = serializers.SerializerMethodField()
    submission_start = serializers.SerializerMethodField()
    submission_end = serializers.SerializerMethodField()

    # 統計情報
    total_invoices = serializers.SerializerMethodField()
    submitted_invoices = serializers.SerializerMethodField()
    pending_invoices = serializers.SerializerMethodField()
    
    class Meta:
        model = MonthlyInvoicePeriod
        fields = [
            'id', 'company', 'company_name', 'year', 'month',
            'start_date', 'end_date',  # フロント用（自動計算フォールバック付き）
            'submission_status', 'submission_start', 'submission_end',
            'deadline_date', 'is_closed', 'closed_by', 'closed_by_name',
            'closed_at', 'notes', 'period_name', 'is_past_deadline',
            'total_invoices', 'submitted_invoices', 'pending_invoices',
            'created_at',
            'special_access_password', 'special_access_expiry',
        ]
        read_only_fields = ['company', 'closed_by', 'closed_at', 'created_at']

    def get_start_date(self, obj):
        """対象期間開始日（前月26日）: DB値がnullなら自動計算"""
        from datetime import date
        if obj.period_start_date:
            return obj.period_start_date.isoformat()
        year, month = obj.year, obj.month
        if month == 1:
            return date(year - 1, 12, 26).isoformat()
        return date(year, month - 1, 26).isoformat()

    def get_end_date(self, obj):
        """対象期間終了日（当月25日）: DB値がnullなら自動計算"""
        from datetime import date
        if obj.period_end_date:
            return obj.period_end_date.isoformat()
        return date(obj.year, obj.month, 25).isoformat()

    def get_submission_start(self, obj):
        """提出開始日（当月26日）"""
        from datetime import date
        return date(obj.year, obj.month, 26).isoformat()

    def get_submission_end(self, obj):
        """提出期限（当月末日）"""
        import calendar
        from datetime import date
        last_day = calendar.monthrange(obj.year, obj.month)[1]
        return date(obj.year, obj.month, last_day).isoformat()

    def get_submission_status(self, obj):
        """提出受付状態: before(受付前) / open(受付中) / closed(締切超過・締め済み)"""
        import calendar
        from datetime import date
        from django.utils import timezone

        if obj.is_closed:
            return 'closed'
        today = timezone.now().date()
        start = date(obj.year, obj.month, 26)
        end = date(obj.year, obj.month, calendar.monthrange(obj.year, obj.month)[1])
        if today < start:
            return 'before'
        if today > end:
            return 'closed'
        return 'open'

    def get_total_invoices(self, obj):
        """この期間の総請求書数"""
        return obj.invoices.count()

    def get_submitted_invoices(self, obj):
        """提出済み請求書数"""
        return obj.invoices.exclude(status='draft').count()

    def get_pending_invoices(self, obj):
        """未提出（下書き）請求書数"""
        return obj.invoices.filter(status='draft').count()


class MonthlyInvoicePeriodListSerializer(serializers.ModelSerializer):
    """月次期間一覧用（軽量版）"""
    period_name = serializers.CharField(read_only=True)
    status_display = serializers.SerializerMethodField()
    
    class Meta:
        model = MonthlyInvoicePeriod
        fields = [
            'id', 'year', 'month', 'period_name', 'deadline_date',
            'is_closed', 'status_display'
        ]
    
    def get_status_display(self, obj):
        # 受付ルール: 当月26日〜月末のみ提出受付
        import calendar
        from datetime import date
        from django.utils import timezone

        if obj.is_closed:
            return '締め済み'
        today = timezone.now().date()
        start = date(obj.year, obj.month, 26)
        end = date(obj.year, obj.month, calendar.monthrange(obj.year, obj.month)[1])
        if today < start:
            return '受付前'
        if today > end:
            return '締切超過'
        return '受付中'


class CustomFieldSerializer(serializers.ModelSerializer):
    """カスタムフィールドシリアライザー"""
    
    class Meta:
        model = CustomField
        fields = [
            'id', 'company', 'field_name', 'field_type',
            'is_required', 'is_active', 'display_order', 'help_text'
        ]


class CustomFieldValueSerializer(serializers.ModelSerializer):
    """カスタムフィールド値シリアライザー"""
    field_name = serializers.CharField(source='custom_field.field_name', read_only=True)
    field_type = serializers.CharField(source='custom_field.field_type', read_only=True)
    
    class Meta:
        model = CustomFieldValue
        fields = ['id', 'custom_field', 'field_name', 'field_type', 'value']


class PDFGenerationLogSerializer(serializers.ModelSerializer):
    """PDF生成履歴シリアライザー"""
    generated_by_name = serializers.CharField(source='generated_by.get_full_name', read_only=True, allow_null=True)
    invoice_number = serializers.CharField(source='invoice.invoice_number', read_only=True)
    
    class Meta:
        model = PDFGenerationLog
        fields = [
            'id', 'invoice', 'invoice_number', 'generated_by',
            'generated_by_name', 'generated_at', 'file_size'
        ]
        read_only_fields = ['generated_at']


# ==========================================
# Phase 1+2: Invoice関連シリアライザー
# ==========================================

class InvoiceCreateSerializer(serializers.ModelSerializer):
    """請求書作成用シリアライザー（Phase 3対応）"""
    # itemsはnested書き込みを行うため、read_only=Trueにしない（デフォルトでwritable）
    items = InvoiceItemSerializer(many=True)
    # 🆕 現場パスワード（フォームから受け取る用、DB保存なし）
    site_password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    # 🆕 特例パスワード（期限バイパス用）
    special_password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    
    class Meta:
        model = Invoice
        fields = [
            'construction_site', 'project_name', 'invoice_date',
            'payment_due_date', 'notes', 'items',
            'site_password', 
            'special_password', # 🆕 特例パスワード
            # Phase 3追加フィールド
            'document_type', 'construction_type', 'construction_type_other',
            'purchase_order',
        ]
        extra_kwargs = {
            'construction_site': {'required': False, 'allow_null': True}
        }
    
    def validate(self, attrs):
        """
        バリデーション
        - 現場パスワードによる現場特定
        - 締め日チェックは提出時（submit）に行うため、ここでは不要
        """
        # 1. 現場パスワード処理
        site_password = attrs.get('site_password')
        construction_site = attrs.get('construction_site')
        
        if site_password and not construction_site:
            from .models import ConstructionSite
            # パスワードで有効な現場を検索
            site = ConstructionSite.objects.filter(
                site_password=site_password,
                is_active=True,
                is_completed=False,
                is_cutoff=False
            ).first()
            
            if not site:
                raise serializers.ValidationError({"site_password": "パスワードに一致する有効な工事現場が見つかりません。"})
            
            attrs['construction_site'] = site
            
            # 現場名も自動設定
            if not attrs.get('project_name'):
                attrs['project_name'] = site.name
        
        # 現場必須チェック
        if not attrs.get('construction_site'):
            raise serializers.ValidationError({"construction_site": "工事現場を選択するか、正しい現場パスワードを入力してください。"})
                
        return attrs

    def create(self, validated_data):
        """
        カスタム作成メソッド
        - ネストされたitemsの作成
        - 合計金額の計算（Safety Fee適用のため）
        - 作成者と会社情報の自動設定
        """
        items_data = validated_data.pop('items', [])
        site_password = validated_data.pop('site_password', None) # 不要なフィールドを除外
        special_password = validated_data.pop('special_password', None) # 不要なフィールドを除外
        
        # ユーザー情報の取得
        user = self.context['request'].user
        validated_data['created_by'] = user

        # --- customer_company の決定（user_type の値に依存せず堅牢に判定） ---
        # 既に save_kwargs 等でセットされていればそれを優先。
        # 無ければユーザーに紐づく協力会社を使う（種別が壊れていても customer_company_id があれば拾える）。
        if not validated_data.get('customer_company') and getattr(user, 'customer_company_id', None):
            validated_data['customer_company'] = user.customer_company

        # --- receiving_company の決定（現場の会社 → 社内ユーザーの会社 → 既定会社） ---
        if not validated_data.get('receiving_company'):
            construction_site = validated_data.get('construction_site')
            if construction_site and construction_site.company_id:
                validated_data['receiving_company'] = construction_site.company
            elif getattr(user, 'company_id', None):
                validated_data['receiving_company'] = user.company
            else:
                validated_data['receiving_company'] = Company.objects.first()

        # --- 最終ガード: customer_company が無いまま INSERT すると DB エラーになるため、
        #     その前に必ず分かりやすいエラーを返す（生の DB エラーをユーザーに見せない） ---
        if not validated_data.get('customer_company'):
            raise serializers.ValidationError(
                {'error': '協力会社情報が設定されていません。お手数ですが平野工務店の経理担当者にご連絡ください。'}
            )

        # Invoice作成
        invoice = Invoice.objects.create(**validated_data)
        
        # Items作成
        from .models import InvoiceItem
        for item_data in items_data:
            # amountはread_onlyなので手動計算して保存
            quantity = item_data.get('quantity', 0)
            unit_price = item_data.get('unit_price', 0)
            amount = quantity * unit_price
            InvoiceItem.objects.create(invoice=invoice, amount=amount, **item_data)
            
        # 合計計算とSafety Fee適用
        invoice.calculate_totals()
        
        return invoice


class InvoiceListSerializer(serializers.ModelSerializer):
    """請求書一覧用シリアライザー（軽量版）"""
    customer_company_name = serializers.CharField(source='customer_company.name', read_only=True)
    construction_site_name_display = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    current_approver_name = serializers.CharField(source='current_approver.get_full_name', read_only=True, allow_null=True)
    # Phase 2追加
    template_name = serializers.CharField(source='template.name', read_only=True, allow_null=True)
    period_name = serializers.CharField(source='invoice_period.period_name', read_only=True, allow_null=True)
    # Phase 3追加
    document_type_display = serializers.CharField(source='get_document_type_display', read_only=True)
    construction_type_name = serializers.CharField(source='construction_type.name', read_only=True, allow_null=True)
    amount_check_result_display = serializers.CharField(source='get_amount_check_result_display', read_only=True)
    
    class Meta:
        model = Invoice
        fields = [
            'id', 'invoice_number', 
            'document_type', 'document_type_display',
            'customer_company_name',
            'construction_site_name_display',
            'construction_type_name',
            'project_name', 'invoice_date', 'payment_due_date',
            'status', 'status_display',
            'total_amount',
            'amount_check_result', 'amount_check_result_display',
            'current_approver_name',
            'created_by_name',
            'created_at', 'updated_at',
            'template', 'template_name',
            'invoice_period', 'period_name',
        ]
    
    def get_construction_site_name_display(self, obj):
        """工事現場名を取得（construction_site_nameまたはconstruction_site.name）"""
        if obj.construction_site_name:
            return obj.construction_site_name
        elif obj.construction_site:
            return obj.construction_site.name
        return ''


class InvoiceSerializer(serializers.ModelSerializer):
    """請求書詳細シリアライザー"""
    items = InvoiceItemSerializer(many=True, read_only=True)
    customer_company_name = serializers.CharField(source='customer_company.name', read_only=True)
    construction_site_name_display = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    current_approver_name = serializers.CharField(source='current_approver.get_full_name', read_only=True, allow_null=True)
    current_approver_email = serializers.CharField(source='current_approver.email', read_only=True, allow_null=True)
    current_step_name = serializers.CharField(source='current_approval_step.step_name', read_only=True, allow_null=True)
    comments = InvoiceCommentSerializer(many=True, read_only=True)
    approval_histories = ApprovalHistorySerializer(many=True, read_only=True)
    approval_route_detail = ApprovalRouteSerializer(source='approval_route', read_only=True)
    # Phase 2追加
    template_name = serializers.CharField(source='template.name', read_only=True, allow_null=True)
    period_name = serializers.CharField(source='invoice_period.period_name', read_only=True, allow_null=True)
    custom_values = CustomFieldValueSerializer(many=True, read_only=True)
    
    class Meta:
        model = Invoice
        fields = [
            'id', 'invoice_number', 
            'customer_company', 'customer_company_name',
            'construction_site', 'construction_site_name_display',
            'project_name', 'invoice_date', 'payment_due_date',
            'status', 'status_display',
            'subtotal', 'tax_amount', 'total_amount',
            'notes', 'items',
            'approval_route', 'approval_route_detail',
            'current_approval_step', 'current_step_name',
            'current_approver', 'current_approver_name', 'current_approver_email',
            'created_by', 'created_by_name',
            'created_at', 'updated_at',
            'comments', 'approval_histories',
            'template', 'template_name',
            'invoice_period', 'period_name',
            'custom_values',
        ]
        read_only_fields = [
            'id', 'invoice_number', 'subtotal', 'tax_amount', 'total_amount',
            'created_by', 'created_at', 'updated_at'
        ]
    
    def get_construction_site_name_display(self, obj):
        """工事現場名を取得"""
        if obj.construction_site_name:
            return obj.construction_site_name
        elif obj.construction_site:
            return obj.construction_site.name
        return ''


# ==========================================
# Phase 3: 新要件シリアライザー
# ==========================================

class ConstructionTypeSerializer(serializers.ModelSerializer):
    """工種シリアライザー"""
    
    class Meta:
        model = ConstructionType
        fields = [
            'id', 'code', 'name', 'description', 
            'usage_count', 'is_active', 'display_order'
        ]
        read_only_fields = ['usage_count']


class PurchaseOrderItemSerializer(serializers.ModelSerializer):
    """注文書明細シリアライザー"""
    
    class Meta:
        model = PurchaseOrderItem
        fields = [
            'id', 'item_number', 'description',
            'quantity', 'unit', 'unit_price', 'amount'
        ]


class PurchaseOrderSerializer(serializers.ModelSerializer):
    """注文書シリアライザー"""
    items = PurchaseOrderItemSerializer(many=True, read_only=True)
    customer_company_name = serializers.CharField(source='customer_company.name', read_only=True)
    construction_site_name = serializers.CharField(source='construction_site.name', read_only=True)
    construction_type_name = serializers.CharField(source='construction_type.name', read_only=True, allow_null=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    invoiced_amount = serializers.SerializerMethodField()
    remaining_amount = serializers.SerializerMethodField()
    
    class Meta:
        model = PurchaseOrder
        fields = [
            'id', 'order_number',
            'customer_company', 'customer_company_name',
            'issuing_company',
            'construction_site', 'construction_site_name',
            'construction_type', 'construction_type_name',
            'subtotal', 'tax_amount', 'total_amount',
            'issue_date', 'delivery_date',
            'status', 'status_display',
            'pdf_file', 'notes',
            'items', 'invoiced_amount', 'remaining_amount',
            'created_by', 'created_by_name',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_by', 'created_at', 'updated_at']
    
    def get_invoiced_amount(self, obj):
        return obj.get_invoiced_amount()
    
    def get_remaining_amount(self, obj):
        return obj.get_remaining_amount()


class PurchaseOrderListSerializer(serializers.ModelSerializer):
    """注文書一覧用シリアライザー"""
    customer_company_name = serializers.CharField(source='customer_company.name', read_only=True)
    construction_site_name = serializers.CharField(source='construction_site.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = PurchaseOrder
        fields = [
            'id', 'order_number',
            'customer_company_name', 'construction_site_name',
            'total_amount', 'issue_date',
            'status', 'status_display', 'created_at'
        ]


class InvoiceChangeHistorySerializer(serializers.ModelSerializer):
    """請求書変更履歴シリアライザー"""
    change_type_display = serializers.CharField(source='get_change_type_display', read_only=True)
    changed_by_name = serializers.CharField(source='changed_by.get_full_name', read_only=True)
    
    class Meta:
        model = InvoiceChangeHistory
        fields = [
            'id', 'invoice',
            'change_type', 'change_type_display',
            'field_name', 'old_value', 'new_value',
            'change_reason',
            'changed_by', 'changed_by_name',
            'changed_at'
        ]
        read_only_fields = ['id', 'changed_at']


class AccessLogSerializer(serializers.ModelSerializer):
    """アクセスログシリアライザー"""
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    action_display = serializers.CharField(source='get_action_display', read_only=True)
    
    class Meta:
        model = AccessLog
        fields = [
            'id', 'user', 'user_name',
            'action', 'action_display',
            'resource_type', 'resource_id',
            'ip_address', 'user_agent',
            'details', 'timestamp'
        ]


class SystemNotificationSerializer(serializers.ModelSerializer):
    """システム通知シリアライザー"""
    notification_type_display = serializers.CharField(source='get_notification_type_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    
    class Meta:
        model = SystemNotification
        fields = [
            'id', 'recipient',
            'notification_type', 'notification_type_display',
            'priority', 'priority_display',
            'title', 'message', 'action_url',
            'related_invoice',
            'is_read', 'read_at', 'created_at'
        ]
        read_only_fields = ['recipient', 'created_at']


class BatchApprovalScheduleSerializer(serializers.ModelSerializer):
    """一斉承認スケジュールシリアライザー"""
    period_name = serializers.CharField(source='period.period_name', read_only=True)
    executed_by_name = serializers.CharField(source='executed_by.get_full_name', read_only=True, allow_null=True)
    
    class Meta:
        model = BatchApprovalSchedule
        fields = [
            'id', 'period', 'period_name',
            'scheduled_datetime',
            'is_executed', 'executed_at',
            'executed_by', 'executed_by_name',
            'target_supervisor_count', 'target_invoice_count',
            'notes', 'created_at'
        ]
        read_only_fields = ['is_executed', 'executed_at', 'executed_by', 'created_at']


# ==========================================
# 工事現場シリアライザー拡張（予算・完成管理）
# ==========================================

class ConstructionSiteDetailSerializer(serializers.ModelSerializer):
    """工事現場詳細シリアライザー（予算・累計情報付き）"""
    company_name = serializers.CharField(source='company.name', read_only=True)
    supervisor_name = serializers.CharField(source='supervisor.get_full_name', read_only=True, allow_null=True)
    completed_by_name = serializers.CharField(source='completed_by.get_full_name', read_only=True, allow_null=True)
    construction_type_name = serializers.CharField(source='construction_type.name', read_only=True, allow_null=True)
    total_invoiced_amount = serializers.SerializerMethodField()
    budget_consumption_rate = serializers.SerializerMethodField()
    is_budget_exceeded = serializers.SerializerMethodField()
    is_budget_alert = serializers.SerializerMethodField()
    
    class Meta:
        model = ConstructionSite
        fields = [
            'id', 'project_code', 'name', 'location',
            'site_password',
            'special_access_password', 'special_access_expiry',
            'construction_type', 'construction_type_name',
            'company', 'company_name',
            'client_name', 'prime_contractor',
            'supervisor', 'supervisor_name',
            'start_date', 'end_date',
            'is_active', 'created_at', 'updated_at',
            'is_completed', 'completion_date', 'completed_by', 'completed_by_name',
            'total_budget', 'budget_alert_threshold',
            'budget_alert_80_notified', 'budget_alert_90_notified', 'budget_alert_100_notified',
            'total_invoiced_amount', 'budget_consumption_rate',
            'is_budget_exceeded', 'is_budget_alert'
        ]
        read_only_fields = ['project_code', 'created_at', 'updated_at', 'completed_by']
    
    def get_total_invoiced_amount(self, obj):
        return obj.get_total_invoiced_amount()
    
    def get_budget_consumption_rate(self, obj):
        return obj.get_budget_consumption_rate()
    
    def get_is_budget_exceeded(self, obj):
        return obj.is_budget_exceeded()
    
    def get_is_budget_alert(self, obj):
        return obj.is_budget_alert()


# ==========================================
# 請求書シリアライザー拡張（訂正期限・金額照合）
# ==========================================

class InvoiceDetailSerializer(serializers.ModelSerializer):
    """請求書詳細シリアライザー（拡張版）"""
    items = InvoiceItemSerializer(many=True, read_only=True)
    customer_company_name = serializers.CharField(source='customer_company.name', read_only=True)
    # 請求元（協力会社）の振込先情報 — 一般的な請求書と同様に表示するため
    customer_company_bank = serializers.SerializerMethodField()
    construction_site_name_display = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    current_approver_name = serializers.CharField(source='current_approver.get_full_name', read_only=True, allow_null=True)
    current_step_name = serializers.CharField(source='current_approval_step.step_name', read_only=True, allow_null=True)
    comments = InvoiceCommentSerializer(many=True, read_only=True)
    approval_histories = ApprovalHistorySerializer(many=True, read_only=True)
    approval_route_detail = ApprovalRouteSerializer(source='approval_route', read_only=True)
    
    # Phase 2
    template_name = serializers.CharField(source='template.name', read_only=True, allow_null=True)
    period_name = serializers.CharField(source='invoice_period.period_name', read_only=True, allow_null=True)
    custom_values = CustomFieldValueSerializer(many=True, read_only=True)
    
    # Phase 3（新要件）
    document_type_display = serializers.CharField(source='get_document_type_display', read_only=True)
    construction_type_name = serializers.CharField(source='construction_type.name', read_only=True, allow_null=True)
    purchase_order_number = serializers.CharField(source='purchase_order.order_number', read_only=True, allow_null=True)
    purchase_order_amount = serializers.DecimalField(source='purchase_order.total_amount', read_only=True, allow_null=True, max_digits=15, decimal_places=0)
    amount_check_result_display = serializers.CharField(source='get_amount_check_result_display', read_only=True)
    change_histories = InvoiceChangeHistorySerializer(many=True, read_only=True)
    
    # 訂正期限関連
    is_correction_allowed_now = serializers.SerializerMethodField()
    correction_deadline_display = serializers.SerializerMethodField()
    
    class Meta:
        model = Invoice
        fields = [
            'id', 'invoice_number', 'document_type', 'document_type_display',
            'customer_company', 'customer_company_name', 'customer_company_bank',
            'construction_site', 'construction_site_name_display',
            'construction_type', 'construction_type_name', 'construction_type_other',
            'purchase_order', 'purchase_order_number', 'purchase_order_amount',
            'project_name', 'invoice_date', 'payment_due_date',
            'status', 'status_display',
            'subtotal', 'tax_amount', 'total_amount',
            'notes', 'items',
            'approval_route', 'approval_route_detail',
            'current_approval_step', 'current_step_name',
            'current_approver', 'current_approver_name',
            'created_by', 'created_by_name',
            'created_at', 'updated_at',
            'comments', 'approval_histories', 'change_histories',
            'template', 'template_name',
            'invoice_period', 'period_name',
            'custom_values',
            # 訂正期限関連
            'received_at', 'correction_deadline',
            'is_correction_allowed', 'is_correction_allowed_now', 'correction_deadline_display',
            # 金額照合関連
            'amount_check_result', 'amount_check_result_display', 'amount_difference',
            # 安全衛生協力会費
            'safety_cooperation_fee', 'safety_fee_notified',
            # 差し戻し関連
            'is_returned', 'can_partner_edit', 'has_corrections',
            'return_reason', 'return_note',
            'partner_acknowledged_at', 'partner_acknowledged_by',
        ]
        read_only_fields = [
            'id', 'invoice_number', 'subtotal', 'tax_amount', 'total_amount',
            'created_by', 'created_at', 'updated_at',
            'safety_cooperation_fee', 'amount_check_result', 'amount_difference'
        ]
    
    def get_construction_site_name_display(self, obj):
        if obj.construction_site_name:
            return obj.construction_site_name
        elif obj.construction_site:
            return obj.construction_site.name
        return ''

    def get_customer_company_bank(self, obj):
        """請求元（協力会社）の振込先情報。未登録項目は空文字で返す。"""
        company = obj.customer_company
        if not company:
            return None
        return {
            'bank_name': getattr(company, 'bank_name', '') or '',
            'bank_branch': getattr(company, 'bank_branch', '') or '',
            'bank_account': getattr(company, 'bank_account', '') or '',
            # 口座名義は協力会社マスタに専用項目が無いため会社名を既定表示
            'account_holder': getattr(company, 'name', '') or '',
            'invoice_registration_number': getattr(company, 'invoice_registration_number', '') or '',
        }

    def get_is_correction_allowed_now(self, obj):
        """現時点で訂正可能かどうか"""
        if not obj.correction_deadline:
            return obj.status == 'draft'
        return timezone.now() <= obj.correction_deadline and obj.status in ['draft', 'returned']
    
    def get_correction_deadline_display(self, obj):
        """訂正期限の表示用文字列"""
        if not obj.correction_deadline:
            return None
        deadline = obj.correction_deadline
        now = timezone.now()
        if now > deadline:
            return f"期限切れ ({deadline.strftime('%Y/%m/%d %H:%M')})"
        remaining = deadline - now
        hours = int(remaining.total_seconds() // 3600)
        if hours < 24:
            return f"あと{hours}時間 ({deadline.strftime('%m/%d %H:%M')}まで)"
        days = hours // 24
        return f"あと{days}日 ({deadline.strftime('%Y/%m/%d %H:%M')}まで)"


# ==========================================
# ダッシュボード用集計シリアライザー
# ==========================================

class SitePaymentSummarySerializer(serializers.Serializer):
    """現場別支払い割合シリアライザー（円グラフ用）"""
    site_id = serializers.IntegerField()
    site_name = serializers.CharField()
    total_amount = serializers.DecimalField(max_digits=15, decimal_places=0)
    percentage = serializers.FloatField()
    budget = serializers.DecimalField(max_digits=15, decimal_places=0, allow_null=True)
    budget_rate = serializers.FloatField(allow_null=True)
    is_alert = serializers.BooleanField()


class MonthlyCompanySummarySerializer(serializers.Serializer):
    """月別・業者別累計シリアライザー（CSV出力用）"""
    company_id = serializers.IntegerField()
    company_name = serializers.CharField()
    month = serializers.CharField()
    invoice_count = serializers.IntegerField()
    total_amount = serializers.DecimalField(max_digits=15, decimal_places=0)
    approved_count = serializers.IntegerField()
    pending_count = serializers.IntegerField()


# ==========================================
# Phase 4: データベース設計書準拠シリアライザー
# ==========================================

class ConstructionTypeUsageSerializer(serializers.ModelSerializer):
    """工種使用履歴シリアライザー"""
    company_name = serializers.CharField(source='company.name', read_only=True)
    construction_type_name = serializers.CharField(source='construction_type.name', read_only=True)
    
    class Meta:
        model = ConstructionTypeUsage
        fields = [
            'id', 'company', 'company_name',
            'construction_type', 'construction_type_name',
            'usage_count', 'last_used_at',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['usage_count', 'last_used_at', 'created_at', 'updated_at']


class BudgetSerializer(serializers.ModelSerializer):
    """予算シリアライザー"""
    project_name = serializers.CharField(source='project.name', read_only=True)
    project_code = serializers.CharField(source='project.project_code', read_only=True)
    period_display = serializers.SerializerMethodField()
    
    class Meta:
        model = Budget
        fields = [
            'id', 'project', 'project_name', 'project_code',
            'budget_year', 'budget_month', 'period_display',
            'budget_amount', 'allocated_amount', 'remaining_amount',
            'notes', 'created_at', 'updated_at'
        ]
        read_only_fields = ['allocated_amount', 'remaining_amount', 'created_at', 'updated_at']
    
    def get_period_display(self, obj):
        if obj.budget_month:
            return f"{obj.budget_year}年{obj.budget_month}月"
        return f"{obj.budget_year}年度"


class SafetyFeeSerializer(serializers.ModelSerializer):
    """安全衛生協力会費シリアライザー"""
    invoice_number = serializers.CharField(source='invoice.invoice_number', read_only=True)
    partner_company_name = serializers.CharField(source='invoice.customer_company.name', read_only=True)
    
    class Meta:
        model = SafetyFee
        fields = [
            'id', 'invoice', 'invoice_number', 'partner_company_name',
            'base_amount', 'fee_rate', 'fee_amount',
            'notification_sent', 'notification_sent_at',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['fee_amount', 'created_at', 'updated_at']


class FileAttachmentSerializer(serializers.ModelSerializer):
    """添付ファイルシリアライザー"""
    uploaded_by_name = serializers.CharField(source='uploaded_by.get_full_name', read_only=True)
    file_type_display = serializers.CharField(source='get_file_type_display', read_only=True)
    file_size_display = serializers.SerializerMethodField()
    
    class Meta:
        model = FileAttachment
        fields = [
            'id', 'invoice', 'purchase_order',
            'file_name', 'file_path', 'file_type', 'file_type_display',
            'file_size', 'file_size_display', 'mime_type',
            'uploaded_by', 'uploaded_by_name',
            'description', 'created_at'
        ]
        read_only_fields = ['file_type', 'file_size', 'mime_type', 'created_at']
    
    def get_file_size_display(self, obj):
        """ファイルサイズを人間が読める形式で表示"""
        size = obj.file_size
        if size < 1024:
            return f"{size} B"
        elif size < 1024 * 1024:
            return f"{size / 1024:.1f} KB"
        elif size < 1024 * 1024 * 1024:
            return f"{size / (1024 * 1024):.1f} MB"
        return f"{size / (1024 * 1024 * 1024):.1f} GB"


class InvoiceApprovalStepSerializer(serializers.ModelSerializer):
    """請求書承認ステップシリアライザー"""
    approver_name = serializers.CharField(source='approver.get_full_name', read_only=True, allow_null=True)
    approver_role_display = serializers.CharField(source='get_approver_role_display', read_only=True)
    step_status_display = serializers.CharField(source='get_step_status_display', read_only=True)
    
    class Meta:
        model = InvoiceApprovalStep
        fields = [
            'id', 'workflow', 'step_number',
            'approver_role', 'approver_role_display',
            'approver', 'approver_name',
            'step_status', 'step_status_display',
            'due_date', 'approved_at', 'comment',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class InvoiceApprovalWorkflowSerializer(serializers.ModelSerializer):
    """請求書承認ワークフローシリアライザー"""
    invoice_number = serializers.CharField(source='invoice.invoice_number', read_only=True)
    workflow_status_display = serializers.CharField(source='get_workflow_status_display', read_only=True)
    steps = InvoiceApprovalStepSerializer(many=True, read_only=True)
    current_step_info = serializers.SerializerMethodField()
    
    class Meta:
        model = InvoiceApprovalWorkflow
        fields = [
            'id', 'invoice', 'invoice_number',
            'current_step', 'total_steps',
            'workflow_status', 'workflow_status_display',
            'started_at', 'completed_at',
            'steps', 'current_step_info',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['started_at', 'completed_at', 'created_at', 'updated_at']
    
    def get_current_step_info(self, obj):
        """現在のステップの詳細情報"""
        current = obj.steps.filter(step_number=obj.current_step).first()
        if current:
            return {
                'step_number': current.step_number,
                'approver_role': current.get_approver_role_display(),
                'approver_name': current.approver.get_full_name() if current.approver else None,
                'status': current.get_step_status_display(),
                'due_date': current.due_date
            }
        return None


class InvoiceApprovalWorkflowDetailSerializer(InvoiceApprovalWorkflowSerializer):
    """請求書承認ワークフロー詳細シリアライザー"""
    invoice_detail = serializers.SerializerMethodField()
    
    class Meta(InvoiceApprovalWorkflowSerializer.Meta):
        fields = InvoiceApprovalWorkflowSerializer.Meta.fields + ['invoice_detail']
    
    def get_invoice_detail(self, obj):
        return {
            'id': obj.invoice.id,
            'invoice_number': obj.invoice.invoice_number,
            'customer_company': obj.invoice.customer_company.name,
            'total_amount': obj.invoice.total_amount,
            'status': obj.invoice.get_status_display()
        }


# ==========================================
# Phase 5: 追加要件シリアライザー
# ==========================================

class InvoiceCorrectionSerializer(serializers.ModelSerializer):
    """請求書修正（赤ペン機能）シリアライザー"""
    corrected_by_name = serializers.CharField(source='corrected_by.get_full_name', read_only=True)
    field_type_display = serializers.CharField(source='get_field_type_display', read_only=True)
    invoice_number = serializers.CharField(source='invoice.invoice_number', read_only=True)
    item_description = serializers.CharField(source='invoice_item.description', read_only=True, allow_null=True)
    
    class Meta:
        model = InvoiceCorrection
        fields = [
            'id', 'invoice', 'invoice_number',
            'invoice_item', 'item_description',
            'field_name', 'field_type', 'field_type_display',
            'original_value', 'corrected_value',
            'correction_reason',
            'corrected_by', 'corrected_by_name',
            'is_approved_by_partner', 'approved_at',
            'created_at'
        ]
        read_only_fields = ['corrected_by', 'is_approved_by_partner', 'approved_at', 'created_at']


class InvoiceCorrectionCreateSerializer(serializers.ModelSerializer):
    """請求書修正作成用シリアライザー"""
    
    class Meta:
        model = InvoiceCorrection
        fields = [
            'invoice', 'invoice_item',
            'field_name', 'field_type',
            'original_value', 'corrected_value',
            'correction_reason'
        ]
    
    def create(self, validated_data):
        user = self.context['request'].user
        validated_data['corrected_by'] = user
        
        correction = InvoiceCorrection.objects.create(**validated_data)
        
        # 修正を適用
        correction.apply_correction()
        
        return correction


class InvoicePartnerViewSerializer(serializers.ModelSerializer):
    """協力会社向け請求書シリアライザー（差し戻し時）"""
    customer_company_name = serializers.CharField(source='customer_company.name', read_only=True)
    construction_site_name_display = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    corrections = InvoiceCorrectionSerializer(many=True, read_only=True)
    can_edit = serializers.SerializerMethodField()
    can_approve_corrections = serializers.SerializerMethodField()
    pending_corrections_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Invoice
        fields = [
            'id', 'invoice_number',
            'customer_company', 'customer_company_name',
            'construction_site', 'construction_site_name_display',
            'project_name', 'invoice_date',
            'subtotal', 'tax_amount', 'total_amount',
            'status', 'status_display',
            'is_returned', 'can_partner_edit', 'has_corrections',
            'return_reason', 'return_note',
            'partner_acknowledged_at', 'partner_acknowledged_by',
            'corrections',
            'can_edit', 'can_approve_corrections', 'pending_corrections_count',
            'created_at', 'updated_at'
        ]
    
    def get_construction_site_name_display(self, obj):
        if obj.construction_site_name:
            return obj.construction_site_name
        elif obj.construction_site:
            return obj.construction_site.name
        return ''
    
    def get_can_edit(self, obj):
        """協力会社が編集可能かどうか"""
        return obj.can_partner_edit and not obj.is_returned
    
    def get_can_approve_corrections(self, obj):
        """協力会社が修正を承認できるかどうか"""
        return obj.is_returned and obj.has_corrections
    
    def get_pending_corrections_count(self, obj):
        """未承認の修正数"""
        return obj.corrections.filter(is_approved_by_partner=False).count()


class UserPDFPermissionSerializer(serializers.Serializer):
    """PDFダウンロード権限確認用シリアライザー"""
    can_download = serializers.BooleanField()
    reason = serializers.CharField()
    
    @classmethod
    def for_user(cls, user, invoice=None):
        """ユーザーのPDF権限を確認"""
        if user.is_super_admin or user.is_superuser:
            return {'can_download': True, 'reason': 'スーパーアドミン権限'}
        elif user.position == 'accountant':
            return {'can_download': True, 'reason': '経理担当権限'}
        else:
            return {
                'can_download': False, 
                'reason': 'PDFダウンロード権限がありません。経理部門にお問い合わせください。'
            }


# ==========================================
# タスク2: 新規ユーザー自己登録機能
# ==========================================

class UserRegistrationRequestSerializer(serializers.ModelSerializer):
    """ユーザー登録申請シリアライザー"""
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    reviewed_by_name = serializers.CharField(source='reviewed_by.get_full_name', read_only=True, allow_null=True)
    
    class Meta:
        model = UserRegistrationRequest
        fields = [
            'id', 'company_name', 'company_name_kana', 'full_name',
            'email', 'phone_number', 'fax_number',
            'postal_code', 'address',
            'representative_name', 'invoice_registration_number', 'head_office_address',
            'department', 'position', 'notes',
            'bank_name', 'bank_branch', 'bank_account_type',
            'bank_account_number', 'bank_account_holder',
            'status', 'status_display', 'submitted_at', 'reviewed_at',
            'reviewed_by', 'reviewed_by_name', 'rejection_reason',
            'created_user'
        ]
        read_only_fields = ['id', 'status', 'submitted_at', 'reviewed_at', 'reviewed_by', 'created_user']


# ==========================================
# タスク3: 支払いカレンダー・締め日管理機能
# ==========================================

class PaymentCalendarSerializer(serializers.ModelSerializer):
    """支払いカレンダーシリアライザー"""
    is_non_standard_deadline = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = PaymentCalendar
        fields = [
            'id', 'year', 'month', 'payment_date', 'deadline_date',
            'is_holiday_period', 'holiday_note', 'is_non_standard_deadline',
            'created_at', 'updated_at'
        ]


class DeadlineNotificationBannerSerializer(serializers.ModelSerializer):
    """締め日変更バナーシリアライザー"""
    display_message = serializers.SerializerMethodField()
    
    class Meta:
        model = DeadlineNotificationBanner
        fields = [
            'id', 'is_active', 'target_year', 'target_month',
            'message_template', 'period_name', 'custom_message',
            'display_message', 'created_at', 'updated_at'
        ]
    
    def get_display_message(self, obj):
        return obj.get_display_message()


# ==========================================
# Phase 6: コア機能強化（ログ・監査）
# ==========================================

class AuditLogSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    action_display = serializers.CharField(source='get_action_display', read_only=True)
    
    class Meta:
        model = AuditLog
        fields = [
            'id', 'user', 'user_name', 'action', 'action_display',
            'target_model', 'target_id', 'target_label',
            'details', 'ip_address', 'user_agent', 'created_at'
        ]
        read_only_fields = fields