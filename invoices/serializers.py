# invoices/serializers.py

from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import (
    Company, Department, CustomerCompany, User,
    Invoice, ApprovalRoute, ApprovalStep,
    ApprovalHistory, InvoiceComment, ConstructionSite, InvoiceItem
)

User = get_user_model()


class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = ['id', 'name', 'postal_code', 'address', 'phone', 'email', 'is_active']


class DepartmentSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source='company.name', read_only=True)
    
    class Meta:
        model = Department
        fields = ['id', 'company', 'company_name', 'name', 'code', 'manager_name', 'is_active']


class CustomerCompanySerializer(serializers.ModelSerializer):
    business_type_display = serializers.CharField(source='get_business_type_display', read_only=True)
    
    class Meta:
        model = CustomerCompany
        fields = [
            'id', 'name', 'business_type', 'business_type_display',
            'postal_code', 'address', 'phone', 'email', 'tax_number',
            'bank_name', 'bank_branch', 'bank_account', 'is_active'
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
            'phone', 'is_active_user', 'date_joined'
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
    
    class Meta:
        model = InvoiceComment
        fields = [
            'id', 'invoice', 'user', 'user_name', 'user_position',
            'comment_type', 'comment_type_display',
            'comment', 'is_private', 'timestamp'
        ]
        read_only_fields = ['id', 'user', 'timestamp']


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
    
    class Meta:
        model = ConstructionSite
        fields = [
            'id', 'name', 'location', 
            'company', 'company_name',
            'supervisor', 'supervisor_name',
            'is_active', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class InvoiceItemSerializer(serializers.ModelSerializer):
    """請求明細シリアライザー"""
    
    class Meta:
        model = InvoiceItem
        fields = [
            'id', 'item_number', 'description', 
            'quantity', 'unit', 'unit_price', 'amount'
        ]
        read_only_fields = ['id', 'amount']


class InvoiceCreateSerializer(serializers.ModelSerializer):
    """請求書作成用シリアライザー"""
    items = InvoiceItemSerializer(many=True)
    
    class Meta:
        model = Invoice
        fields = [
            'construction_site', 'project_name', 'invoice_date',
            'payment_due_date', 'notes', 'items'
        ]
    
    def create(self, validated_data):
        items_data = validated_data.pop('items')
        
        # リクエストユーザーの情報を取得
        user = self.context['request'].user
        
        # created_byを設定
        validated_data['created_by'] = user
        
        # customer_companyを自動設定（協力会社ユーザーの場合）
        if user.user_type == 'customer' and user.customer_company:
            validated_data['customer_company'] = user.customer_company
        
        # receiving_company を自動設定
        from .models import Company
        receiving_company = Company.objects.first()
        if receiving_company:
            validated_data['receiving_company'] = receiving_company
        
        # invoiceを作成
        invoice = Invoice.objects.create(**validated_data)
        
        # 明細を作成
        for item_data in items_data:
            InvoiceItem.objects.create(invoice=invoice, **item_data)
        
        # 金額計算
        invoice.calculate_totals()
        
        return invoice


class InvoiceListSerializer(serializers.ModelSerializer):
    """請求書一覧用シリアライザー（軽量版）"""
    customer_company_name = serializers.CharField(source='customer_company.name', read_only=True)
    construction_site_name_display = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    current_approver_name = serializers.CharField(source='current_approver.get_full_name', read_only=True, allow_null=True)
    
    class Meta:
        model = Invoice
        fields = [
            'id', 'invoice_number', 
            'customer_company_name',
            'construction_site_name_display',
            'project_name', 'invoice_date', 'payment_due_date',
            'status', 'status_display',
            'total_amount',
            'current_approver_name',
            'created_by_name',
            'created_at', 'updated_at',
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
    current_step_name = serializers.CharField(source='current_approval_step.step_name', read_only=True, allow_null=True)
    comments = InvoiceCommentSerializer(many=True, read_only=True)
    approval_histories = ApprovalHistorySerializer(many=True, read_only=True)
    approval_route_detail = ApprovalRouteSerializer(source='approval_route', read_only=True)
    
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
            'current_approver', 'current_approver_name',
            'created_by', 'created_by_name',
            'created_at', 'updated_at',
            'comments', 'approval_histories'
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