# invoices/models.py

import uuid
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.validators import MinValueValidator
from django.utils import timezone
from decimal import Decimal


class Company(models.Model):
    """会社マスター（発注会社）"""
    name = models.CharField(max_length=100, verbose_name="会社名")
    postal_code = models.CharField(max_length=10, verbose_name="郵便番号", blank=True)
    address = models.TextField(verbose_name="住所", blank=True)
    phone = models.CharField(max_length=20, verbose_name="電話番号", blank=True)
    email = models.EmailField(verbose_name="代表メールアドレス", blank=True)
    tax_number = models.CharField(max_length=20, verbose_name="法人番号", blank=True)
    logo = models.ImageField(upload_to='company_logos/', verbose_name="会社ロゴ", blank=True)
    is_active = models.BooleanField(default=True, verbose_name="有効")
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "会社"
        verbose_name_plural = "会社一覧"
    
    def __str__(self):
        return self.name


class Department(models.Model):
    """部署マスター"""
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='departments')
    name = models.CharField(max_length=50, verbose_name="部署名")
    code = models.CharField(max_length=20, verbose_name="部署コード", blank=True)
    manager_name = models.CharField(max_length=50, verbose_name="部署長名", blank=True)
    is_active = models.BooleanField(default=True, verbose_name="有効")
    
    class Meta:
        verbose_name = "部署"
        verbose_name_plural = "部署一覧"
        unique_together = ['company', 'code']
    
    def __str__(self):
        return f"{self.company.name} - {self.name}"


class CustomerCompany(models.Model):
    """顧客会社マスター（協力会社・サプライヤー）"""
    BUSINESS_TYPE_CHOICES = [
        ('subcontractor', '協力会社'),
        ('supplier', '資材サプライヤー'),
        ('service', 'サービス業者'),
        ('consultant', 'コンサルタント'),
        ('other', 'その他'),
    ]
    
    name = models.CharField(max_length=100, verbose_name="会社名")
    business_type = models.CharField(
        max_length=20, 
        choices=BUSINESS_TYPE_CHOICES, 
        verbose_name="業種"
    )
    postal_code = models.CharField(max_length=10, verbose_name="郵便番号", blank=True)
    address = models.TextField(verbose_name="住所", blank=True)
    phone = models.CharField(max_length=20, verbose_name="電話番号", blank=True)
    email = models.EmailField(verbose_name="代表メールアドレス")
    tax_number = models.CharField(max_length=20, verbose_name="法人番号", blank=True)
    bank_name = models.CharField(max_length=50, verbose_name="銀行名", blank=True)
    bank_branch = models.CharField(max_length=50, verbose_name="支店名", blank=True)
    bank_account = models.CharField(max_length=20, verbose_name="口座番号", blank=True)
    is_active = models.BooleanField(default=True, verbose_name="有効")
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "顧客会社"
        verbose_name_plural = "顧客会社一覧"
    
    def __str__(self):
        return f"{self.name} ({self.get_business_type_display()})"


class User(AbstractUser):
    """カスタムユーザーモデル"""
    USER_TYPE_CHOICES = [
        ('internal', '社内ユーザー'),
        ('customer', '顧客ユーザー'),
    ]
    
    POSITION_CHOICES = [
        ('president', '社長'),
        ('director', '取締役'),
        ('manager', '部長'),
        ('supervisor', '課長'),
        ('staff', '一般社員'),
        ('accountant', '経理担当'),
        ('admin', 'システム管理者'),
    ]
    
    user_type = models.CharField(
        max_length=10,
        choices=USER_TYPE_CHOICES,
        default='internal',
        verbose_name="ユーザー種別"
    )
    
    # 社内ユーザー用フィールド
    company = models.ForeignKey(
        Company, 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True,
        verbose_name="所属会社"
    )
    department = models.ForeignKey(
        Department,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name="所属部署"
    )
    position = models.CharField(
        max_length=20,
        choices=POSITION_CHOICES,
        blank=True,
        verbose_name="役職"
    )
    
    # 顧客ユーザー用フィールド
    customer_company = models.ForeignKey(
        CustomerCompany,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        verbose_name="顧客会社"
    )
    is_primary_contact = models.BooleanField(
        default=False,
        verbose_name="主担当者"
    )
    
    # 共通フィールド
    phone = models.CharField(max_length=20, verbose_name="電話番号", blank=True)
    is_active_user = models.BooleanField(default=True, verbose_name="アクティブ")
    last_login_ip = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "ユーザー"
        verbose_name_plural = "ユーザー一覧"
    
    def __str__(self):
        if self.user_type == 'internal':
            return f"{self.last_name} {self.first_name} ({self.company})"
        else:
            return f"{self.last_name} {self.first_name} ({self.customer_company})"


class ApprovalRoute(models.Model):
    """承認ルートマスター"""
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    name = models.CharField(max_length=100, verbose_name="承認ルート名")
    description = models.TextField(verbose_name="説明", blank=True)
    is_active = models.BooleanField(default=True, verbose_name="有効")
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "承認ルート"
        verbose_name_plural = "承認ルート一覧"
    
    def __str__(self):
        return f"{self.company.name} - {self.name}"


class ApprovalStep(models.Model):
    """承認ステップ"""
    route = models.ForeignKey(
        ApprovalRoute, 
        on_delete=models.CASCADE, 
        related_name='steps'
    )
    step_order = models.IntegerField(verbose_name="ステップ順序")
    step_name = models.CharField(max_length=50, verbose_name="ステップ名")
    approver_position = models.CharField(
        max_length=20,
        choices=User.POSITION_CHOICES,
        verbose_name="承認者役職"
    )
    approver_user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name="指定承認者"
    )
    is_required = models.BooleanField(default=True, verbose_name="必須ステップ")
    timeout_days = models.IntegerField(default=7, verbose_name="承認期限（日数）")
    
    class Meta:
        verbose_name = "承認ステップ"
        verbose_name_plural = "承認ステップ一覧"
        unique_together = ['route', 'step_order']
        ordering = ['step_order']
    
    def __str__(self):
        return f"{self.route.name} - Step{self.step_order}: {self.step_name}"


class Invoice(models.Model):
    """請求書マスター"""
    STATUS_CHOICES = [
        ('draft', '下書き'),
        ('submitted', '送付済み'),
        ('received', '受付済み'),
        ('pending_approval', '承認待ち'),
        ('approved', '承認済み'),
        ('rejected', '却下'),
        ('returned', '差し戻し'),
        ('payment_preparing', '支払い準備中'),
        ('paid', '支払い済み'),
    ]
    
    # 基本情報
    invoice_number = models.CharField(max_length=50, unique=True, verbose_name="請求書番号")
    unique_url = models.UUIDField(default=uuid.uuid4, unique=True, verbose_name="固有URL")
    unique_number = models.CharField(max_length=20, unique=True, verbose_name="管理番号")
    
    # 関連会社
    customer_company = models.ForeignKey(
        CustomerCompany,
        on_delete=models.CASCADE,
        verbose_name="請求元会社"
    )
    receiving_company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        verbose_name="請求先会社"
    )
    
    # 金額・日付
    amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        verbose_name="請求金額"
    )
    tax_amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name="税額"
    )
    issue_date = models.DateField(verbose_name="発行日")
    due_date = models.DateField(verbose_name="支払期日")
    
    # プロジェクト情報
    project_name = models.CharField(max_length=100, verbose_name="工事名", blank=True)
    project_code = models.CharField(max_length=50, verbose_name="工事コード", blank=True)
    department_code = models.CharField(max_length=20, verbose_name="部門コード", blank=True)
    
    # ファイル
    file = models.FileField(upload_to='invoices/', verbose_name="請求書ファイル")
    
    # ステータス・承認
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='draft',
        verbose_name="ステータス"
    )
    approval_route = models.ForeignKey(
        ApprovalRoute,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name="承認ルート"
    )
    current_approval_step = models.ForeignKey(
        ApprovalStep,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name="現在の承認ステップ"
    )
    
    # 作成・更新情報
    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='created_invoices',
        verbose_name="作成者"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="作成日時")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新日時")
    
    class Meta:
        verbose_name = "請求書"
        verbose_name_plural = "請求書一覧"
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.invoice_number} - {self.customer_company.name}"
    
    def save(self, *args, **kwargs):
        if not self.unique_number:
            # 管理番号の自動生成（例: INV-2024-001）
            year = self.created_at.year if self.created_at else timezone.now().year
            last_number = Invoice.objects.filter(
                unique_number__startswith=f'INV-{year}-'
            ).count()
            self.unique_number = f'INV-{year}-{str(last_number + 1).zfill(3)}'
        super().save(*args, **kwargs)


class ApprovalHistory(models.Model):
    """承認履歴"""
    ACTION_CHOICES = [
        ('submitted', '送付'),
        ('approved', '承認'),
        ('rejected', '却下'),
        ('returned', '差し戻し'),
        ('commented', 'コメント'),
    ]
    
    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.CASCADE,
        related_name='approval_histories'
    )
    approval_step = models.ForeignKey(
        ApprovalStep,
        on_delete=models.CASCADE,
        null=True,
        blank=True
    )
    user = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name="実行者")
    action = models.CharField(max_length=20, choices=ACTION_CHOICES, verbose_name="アクション")
    comment = models.TextField(verbose_name="コメント", blank=True)
    timestamp = models.DateTimeField(auto_now_add=True, verbose_name="実行日時")
    
    class Meta:
        verbose_name = "承認履歴"
        verbose_name_plural = "承認履歴一覧"
        ordering = ['-timestamp']
    
    def __str__(self):
        return f"{self.invoice.invoice_number} - {self.get_action_display()} by {self.user}"


class InvoiceComment(models.Model):
    """請求書コメント"""
    COMMENT_TYPE_CHOICES = [
        ('general', '一般コメント'),
        ('approval', '承認関連'),
        ('payment', '支払い関連'),
        ('correction', '修正依頼'),
        ('internal_memo', '内部メモ'),
    ]
    
    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.CASCADE,
        related_name='comments'
    )
    user = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name="投稿者")
    comment_type = models.CharField(
        max_length=20,
        choices=COMMENT_TYPE_CHOICES,
        default='general',
        verbose_name="コメント種別"
    )
    comment = models.TextField(verbose_name="コメント")
    is_private = models.BooleanField(default=False, verbose_name="社内限定")
    timestamp = models.DateTimeField(auto_now_add=True, verbose_name="投稿日時")
    
    class Meta:
        verbose_name = "請求書コメント"
        verbose_name_plural = "請求書コメント一覧"
        ordering = ['-timestamp']
    
    def __str__(self):
        return f"{self.invoice.invoice_number} - {self.user} ({self.timestamp.strftime('%Y/%m/%d %H:%M')})"