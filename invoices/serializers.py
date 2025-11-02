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
    approver_name = serializers.CharField(source='approver_user.get_full_name', read_only=True)
    
    class Meta:
        model = ApprovalStep
        fields = [
            'id', 'route', 'step_order', 'step_name',
            'approver_position', 'approver_user', 'approver_name',
            'is_required', 'timeout_days'
        ]


class ApprovalRouteSerializer(serializers.ModelSerializer):
    steps = ApprovalStepSerializer(many=True, read_only=True)
    company_name = serializers.CharField(source='company.name', read_only=True)
    
    class Meta:
        model = ApprovalRoute
        fields = ['id', 'company', 'company_name', 'name', 'description', 'is_active', 'steps']


class InvoiceCommentSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    comment_type_display = serializers.CharField(source='get_comment_type_display', read_only=True)
    
    class Meta:
        model = InvoiceComment
        fields = [
            'id', 'invoice', 'user', 'user_name',
            'comment_type', 'comment_type_display',
            'comment', 'is_private', 'timestamp'
        ]
        read_only_fields = ['id', 'user', 'timestamp']


class ApprovalHistorySerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    action_display = serializers.CharField(source='get_action_display', read_only=True)
    step_name = serializers.CharField(source='approval_step.step_name', read_only=True)
    
    class Meta:
        model = ApprovalHistory
        fields = [
            'id', 'invoice', 'approval_step', 'step_name',
            'user', 'user_name', 'action', 'action_display',
            'comment', 'timestamp'
        ]
        read_only_fields = ['id', 'user', 'timestamp']


class ConstructionSiteSerializer(serializers.ModelSerializer):
    """工事現場シリアライザー"""
    company_name = serializers.CharField(source='company.name', read_only=True)
    
    class Meta:
        model = ConstructionSite
        fields = ['id', 'name', 'location', 'company', 'company_name', 'is_active', 'created_at']
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
        
        # デバッグログ
        print(f"=== デバッグ ===")
        print(f"User: {user.username}")
        print(f"User type: {user.user_type}")
        print(f"Customer company: {user.customer_company}")
        print(f"===============")
        
        # created_byを設定
        validated_data['created_by'] = user
        
        # customer_companyを自動設定（協力会社ユーザーの場合）
        if user.user_type == 'customer' and user.customer_company:
            validated_data['customer_company'] = user.customer_company
            print(f"✅ customer_company設定: {user.customer_company.name}")
        
        # receiving_company を自動設定（最初の Company を使用）
        from .models import Company
        receiving_company = Company.objects.first()
        if receiving_company:
            validated_data['receiving_company'] = receiving_company
            print(f"✅ receiving_company設定: {receiving_company.name}")
        
        # invoiceを作成
        invoice = Invoice.objects.create(**validated_data)
        
        # 明細を作成
        for item_data in items_data:
            InvoiceItem.objects.create(invoice=invoice, **item_data)
        
        # 金額計算
        invoice.calculate_totals()
        
        return invoice


class InvoiceSerializer(serializers.ModelSerializer):
    """請求書詳細シリアライザー"""
    items = InvoiceItemSerializer(many=True, read_only=True)
    customer_company_name = serializers.CharField(source='customer_company.name', read_only=True)
    construction_site_name = serializers.CharField(source='construction_site.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    comments = InvoiceCommentSerializer(many=True, read_only=True)
    approval_histories = ApprovalHistorySerializer(many=True, read_only=True)
    
    class Meta:
        model = Invoice
        fields = [
            'id', 'invoice_number', 
            'customer_company', 'customer_company_name',
            'construction_site', 'construction_site_name',
            'project_name', 'invoice_date', 'payment_due_date',
            'status', 'status_display',
            'subtotal', 'tax_amount', 'total_amount',
            'notes', 'items',
            'created_by', 'created_by_name',
            'created_at', 'updated_at',
            'comments', 'approval_histories'
        ]
        read_only_fields = [
            'id', 'invoice_number', 'subtotal', 'tax_amount', 'total_amount',
            'created_by', 'created_at', 'updated_at'
        ]