# invoices/models.py

import uuid
from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from decimal import Decimal
from datetime import timedelta


# ==========================================
# 工種マスタ（15種類）
# ==========================================

class ConstructionType(models.Model):
    """工種マスタ - 15種類の工種を事前定義"""
    CONSTRUCTION_TYPES = [
        ('direct_temporary', '直接仮設工事'),
        ('earthwork', '土工事'),
        ('pile', '杭工事'),
        ('reinforcement', '鉄筋工事'),
        ('concrete', 'コンクリート工事'),
        ('formwork', '型枠工事'),
        ('steel_structure', '鉄骨工事'),
        ('waterproofing', '防水工事'),
        ('stone_tile', '石タイル工事'),
        ('alc', 'ALC工事'),
        ('roofing', '屋根樋工事'),
        ('plastering', '左官工事'),
        ('metal', '金属工事'),
        ('metal_fittings', '金属製建具工事'),
        ('wood_fittings', '木製建具工事'),
        ('glass', '硝子工事'),
        ('painting', '塗装工事'),
        ('carpentry', '木工事'),
        ('light_steel', '軽鉄工事'),
        ('insulation', '被覆工事'),
        ('interior', '内装工事'),
        ('exterior', '外装工事'),
        ('fixtures', '什器工事'),
        ('furniture', '家具工事'),
        ('heating', '暖房器具工事'),
        ('unit', 'ユニット工事'),
        ('miscellaneous', '雑工事'),
        ('electrical', '電気設備工事'),
        ('plumbing', '給排水衛生設備工事'),
        ('hvac', '空調換気設備工事'),
        ('elevator', 'EV工事'),
        ('mechanical', '機械設備工事'),
        ('other_equipment', 'その他設備工事'),
        ('landscaping', '外構工事'),
        ('demolition', '解体工事'),
        ('other', 'その他工事'),
    ]
    
    code = models.CharField(max_length=30, unique=True, verbose_name="工種コード")
    name = models.CharField(max_length=50, verbose_name="工種名")
    description = models.TextField(verbose_name="説明", blank=True)
    usage_count = models.IntegerField(default=0, verbose_name="使用回数")
    is_active = models.BooleanField(default=True, verbose_name="有効")
    display_order = models.IntegerField(default=0, verbose_name="表示順")
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'construction_types'
        verbose_name = "工種"
        verbose_name_plural = "工種一覧"
        ordering = ['-usage_count', 'display_order', 'name']
    
    def __str__(self):
        return self.name
    
    def increment_usage(self):
        """使用回数をインクリメント（よく使う工種を上位表示するため）"""
        self.usage_count += 1
        self.save(update_fields=['usage_count'])


# ==========================================
# 工種使用履歴（協力会社ごとの使用頻度）
# ==========================================

class ConstructionTypeUsage(models.Model):
    """工種使用履歴 - 協力会社ごとの工種使用頻度を記録"""
    company = models.ForeignKey(
        'CustomerCompany',
        on_delete=models.CASCADE,
        related_name='construction_type_usages',
        verbose_name="協力会社"
    )
    construction_type = models.ForeignKey(
        ConstructionType,
        on_delete=models.CASCADE,
        related_name='company_usages',
        verbose_name="工種"
    )
    usage_count = models.IntegerField(default=0, verbose_name="使用回数")
    last_used_at = models.DateTimeField(null=True, blank=True, verbose_name="最終使用日時")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'construction_type_usages'
        verbose_name = "工種使用履歴"
        verbose_name_plural = "工種使用履歴一覧"
        unique_together = ['company', 'construction_type']
        ordering = ['-usage_count', '-last_used_at']
        indexes = [
            models.Index(fields=['company', 'usage_count']),
        ]
    
    def __str__(self):
        return f"{self.company.name} - {self.construction_type.name} ({self.usage_count}回)"
    
    @classmethod
    def increment(cls, company, construction_type):
        """使用回数をインクリメント"""
        usage, created = cls.objects.get_or_create(
            company=company,
            construction_type=construction_type
        )
        usage.usage_count += 1
        usage.last_used_at = timezone.now()
        usage.save()
        return usage
    
    @classmethod
    def get_sorted_types_for_company(cls, company):
        """協力会社用にソートされた工種リストを取得"""
        # 使用履歴のある工種を使用頻度順で取得
        used_types = cls.objects.filter(company=company).values_list(
            'construction_type_id', flat=True
        ).order_by('-usage_count')
        
        # 全工種を取得
        all_types = list(ConstructionType.objects.filter(is_active=True))
        
        # 使用頻度順にソート
        sorted_types = []
        used_type_ids = list(used_types)
        
        for type_id in used_type_ids:
            for ct in all_types:
                if ct.id == type_id:
                    sorted_types.append(ct)
                    all_types.remove(ct)
                    break
        
        # 未使用の工種を最後に追加
        sorted_types.extend(all_types)
        
        return sorted_types


class UserManager(BaseUserManager):
    """カスタムユーザーマネージャー"""
    
    def create_user(self, username, email=None, password=None, **extra_fields):
        """通常ユーザーを作成"""
        if not username:
            raise ValueError('ユーザー名は必須です')
        
        email = self.normalize_email(email) if email else None
        user = self.model(username=username, email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user
    
    def create_superuser(self, username, email=None, password=None, **extra_fields):
        """スーパーユーザーを作成"""
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        extra_fields.setdefault('user_type', 'internal')
        
        if extra_fields.get('is_staff') is not True:
            raise ValueError('スーパーユーザーはis_staff=Trueである必要があります')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('スーパーユーザーはis_superuser=Trueである必要があります')
        
        return self.create_user(username, email, password, **extra_fields)


class Company(models.Model):
    """会社マスター（発注会社）"""
    COMPANY_TYPE_CHOICES = [
        ('client', '発注会社'),
        ('partner', '協力会社'),
    ]
    
    name = models.CharField(max_length=200, verbose_name="会社名")
    name_kana = models.CharField(max_length=200, verbose_name="会社名（カナ）", blank=True)
    company_type = models.CharField(
        max_length=20,
        choices=COMPANY_TYPE_CHOICES,
        default='client',
        verbose_name="会社種別"
    )
    representative_name = models.CharField(max_length=100, verbose_name="代表者名", blank=True)
    postal_code = models.CharField(max_length=10, verbose_name="郵便番号", blank=True)
    address = models.TextField(verbose_name="住所", blank=True)
    phone = models.CharField(max_length=20, verbose_name="電話番号", blank=True)
    email = models.EmailField(verbose_name="代表メールアドレス", blank=True)
    tax_number = models.CharField(max_length=50, verbose_name="法人番号", blank=True)
    logo = models.ImageField(upload_to='company_logos/', verbose_name="会社ロゴ", blank=True)
    
    # 🆕 銀行情報
    bank_name = models.CharField(max_length=100, verbose_name="銀行名", blank=True)
    bank_branch = models.CharField(max_length=100, verbose_name="支店名", blank=True)
    bank_account_type = models.CharField(
        max_length=20,
        choices=[('ordinary', '普通'), ('current', '当座'), ('savings', '貯蓄')],
        default='ordinary',
        verbose_name="口座種別",
        blank=True
    )
    bank_account_number = models.CharField(max_length=20, verbose_name="口座番号", blank=True)
    bank_account_holder = models.CharField(max_length=100, verbose_name="口座名義", blank=True)
    
    # 🆕 取引情報
    contract_start_date = models.DateField(verbose_name="取引開始日", null=True, blank=True)
    
    is_active = models.BooleanField(default=True, verbose_name="有効")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "会社"
        verbose_name_plural = "会社一覧"
        indexes = [
            models.Index(fields=['company_type', 'is_active']),
        ]
    
    def __str__(self):
        return self.name


class Department(models.Model):
    """部署マスター"""
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='departments')
    name = models.CharField(max_length=100, verbose_name="部署名")
    code = models.CharField(max_length=20, verbose_name="部署コード", blank=True)
    manager_name = models.CharField(max_length=50, verbose_name="部署長名", blank=True)
    
    # 🆕 階層構造用の自己参照
    parent_department = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='child_departments',
        verbose_name="親部署"
    )
    
    is_active = models.BooleanField(default=True, verbose_name="有効")
    created_at = models.DateTimeField(auto_now_add=True, null=True)
    updated_at = models.DateTimeField(auto_now=True, null=True)
    
    class Meta:
        verbose_name = "部署"
        verbose_name_plural = "部署一覧"
        unique_together = ['company', 'code']
        indexes = [
            models.Index(fields=['company', 'parent_department']),
        ]
    
    def __str__(self):
        return f"{self.company.name} - {self.name}"
    
    def get_ancestors(self):
        """すべての親部署を取得"""
        ancestors = []
        current = self.parent_department
        while current:
            ancestors.append(current)
            current = current.parent_department
        return ancestors
    
    def get_descendants(self):
        """すべての子部署を取得"""
        descendants = list(self.child_departments.all())
        for child in self.child_departments.all():
            descendants.extend(child.get_descendants())
        return descendants


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
    name_kana = models.CharField(max_length=200, verbose_name="会社名（ふりがな）", blank=True)
    business_type = models.CharField(
        max_length=20, 
        choices=BUSINESS_TYPE_CHOICES, 
        verbose_name="業種"
    )
    
    # 代表者情報
    representative_name = models.CharField(max_length=100, verbose_name="代表者名", blank=True)
    
    # インボイス制度対応
    invoice_registration_number = models.CharField(
        max_length=20, verbose_name="インボイス番号",
        blank=True, help_text="T+13桁の番号（例: T1234567890123）"
    )
    
    # 連絡先（事務所/支店）
    postal_code = models.CharField(max_length=10, verbose_name="郵便番号", blank=True)
    address = models.TextField(verbose_name="住所", blank=True)
    phone = models.CharField(max_length=20, verbose_name="電話番号", blank=True)
    fax = models.CharField(max_length=20, verbose_name="FAX番号", blank=True)
    email = models.EmailField(verbose_name="代表メールアドレス")
    
    # 本社情報（事務所と異なる場合）
    head_office_postal_code = models.CharField(max_length=10, verbose_name="本社郵便番号", blank=True)
    head_office_address = models.TextField(verbose_name="本社住所", blank=True)
    
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
    
    # 🆕 更新: 役職に承認フロー用の役職を追加
    POSITION_CHOICES = [
        ('site_supervisor', '現場所長'),
        ('department_manager', '部長'),
        ('managing_director', '常務取締役'),
        ('senior_managing_director', '専務取締役'),
        ('president', '代表取締役社長'),
        ('accountant', '総務部 経理担当'),
        ('director', '取締役'),
        ('supervisor', '課長'),
        ('staff', '一般社員'),
        ('admin', 'システム管理者'),
    ]
    
    user_type = models.CharField(
        max_length=10,
        choices=USER_TYPE_CHOICES,
        default='internal',
        verbose_name="ユーザー種別"
    )
    
    # メールアドレス（USERNAME_FIELDとして使用するためuniqueにオーバーライド）
    email = models.EmailField(
        unique=True,
        verbose_name="メールアドレス",
        help_text="ログインIDとして使用されます"
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
        max_length=30,
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
    
    # 🆕 スーパーアドミン権限（本庄さん専用）
    is_super_admin = models.BooleanField(
        default=False,
        verbose_name="スーパー管理者",
        help_text="全機能へのアクセス権限（期限切れ書類の編集、全データ閲覧など）"
    )
    
    # 🆕 監督者保存制限
    can_save_data = models.BooleanField(
        default=True,
        verbose_name="データ保存可能",
        help_text="False: 閲覧・承認のみ可能（ダウンロード不可）"
    )
    
    objects = UserManager()
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']
    
    class Meta:
        verbose_name = "ユーザー"
        verbose_name_plural = "ユーザー一覧"
    
    def __str__(self):
        if self.user_type == 'internal':
            position_display = self.get_position_display() if self.position else ''
            return f"{self.last_name} {self.first_name} ({position_display})"
        else:
            return f"{self.last_name} {self.first_name} ({self.customer_company})"


class ApprovalRoute(models.Model):
    """承認ルートマスター"""
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    name = models.CharField(max_length=100, verbose_name="承認ルート名")
    description = models.TextField(verbose_name="説明", blank=True)
    is_default = models.BooleanField(default=False, verbose_name="デフォルトルート")
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
        max_length=30,
        choices=User.POSITION_CHOICES,
        verbose_name="承認者役職"
    )
    approver_user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name="指定承認者",
        help_text="特定のユーザーを指定する場合（オプション）"
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


class ConstructionSite(models.Model):
    """工事現場モデル（設計書: project テーブル）"""
    # 🆕 工事コード（ユニーク、空の場合はnull）
    project_code = models.CharField(
        max_length=50,
        unique=True,
        verbose_name="工事コード",
        blank=True,
        null=True
    )
    name = models.CharField(max_length=200, verbose_name="工事名")
    location = models.TextField(verbose_name="工事場所", blank=True)
    
    # 🆕 現場パスワード (パートナー選択用)
    site_password = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        verbose_name="現場パスワード",
        help_text="協力会社が請求書を作成する際に入力するパスワード"
    )

    # 🆕 特例請求用パスワード（期限切れ後も作成可能にする）
    special_access_password = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        verbose_name="特例請求用パスワード",
        help_text="締め日過ぎても請求書を作成できるようにするためのパスワード"
    )
    
    special_access_expiry = models.DateField(
        null=True, 
        blank=True,
        verbose_name="特例有効期限",
        help_text="この日付までは特例パスワードが有効"
    )
    
    # 🆕 工種
    construction_type = models.ForeignKey(
        'ConstructionType',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='construction_sites',
        verbose_name="工種"
    )
    
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name='construction_sites',
        verbose_name="発注会社"
    )
    
    # 🆕 発注者・元請業者
    client_name = models.CharField(max_length=200, verbose_name="発注者名", blank=True)
    prime_contractor = models.CharField(max_length=200, verbose_name="元請業者名", blank=True)
    
    # 現場監督
    supervisor = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='supervised_sites',
        verbose_name="現場監督",
        limit_choices_to={'user_type': 'internal'}
    )
    
    # 🆕 工事期間
    start_date = models.DateField(verbose_name="工事開始日", null=True, blank=True)
    end_date = models.DateField(verbose_name="工事終了日", null=True, blank=True)
    
    is_active = models.BooleanField(default=True, verbose_name="有効")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="作成日時")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新日時")
    
    # 4.1 現場完成ボタン用フィールド
    is_completed = models.BooleanField(default=False, verbose_name="完成")
    completion_date = models.DateField(null=True, blank=True, verbose_name="完成日")
    completed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='completed_sites',
        verbose_name="完成処理者"
    )
    
    # 2.3 打ち切り機能
    is_cutoff = models.BooleanField(
        default=False,
        verbose_name="打ち切り",
        help_text="打ち切り後は新規請求書作成不可"
    )
    cutoff_date = models.DateField(null=True, blank=True, verbose_name="打ち切り日")
    cutoff_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='cutoff_sites',
        verbose_name="打ち切り実行者"
    )
    cutoff_reason = models.TextField(blank=True, verbose_name="打ち切り理由")
    final_invoiced_amount = models.DecimalField(
        max_digits=15, decimal_places=0, default=0,
        verbose_name="最終請求累計額",
        help_text="打ち切り時点での累計請求額"
    )
    
    # 3.2 実行予算管理用フィールド
    total_budget = models.DecimalField(
        max_digits=15, decimal_places=2, default=0,
        verbose_name="予算金額"
    )
    budget_alert_threshold = models.IntegerField(
        default=90, verbose_name="予算アラート閾値(%)",
        help_text="この割合を超えたらアラートを表示"
    )
    
    # 予算アラート通知履歴
    budget_alert_80_notified = models.BooleanField(default=False, verbose_name="80%到達通知済み")
    budget_alert_90_notified = models.BooleanField(default=False, verbose_name="90%到達通知済み")
    budget_alert_100_notified = models.BooleanField(default=False, verbose_name="100%超過通知済み")
    
    class Meta:
        verbose_name = "工事現場"
        verbose_name_plural = "工事現場一覧"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['construction_type', 'supervisor', 'is_completed']),
            models.Index(fields=['start_date', 'end_date']),
        ]
    
    def __str__(self):
        supervisor_name = f" ({self.supervisor.get_full_name()})" if self.supervisor else ""
        status = " [完成]" if self.is_completed else ""
        return f"{self.name}{supervisor_name}{status}"
    
    def save(self, *args, **kwargs):
        # 工事コードの自動生成（空文字の場合もnullに変換）
        if not self.project_code or self.project_code.strip() == '':
            import datetime
            today = datetime.date.today()
            year = today.year
            last_site = ConstructionSite.objects.filter(
                project_code__startswith=f'PRJ-{year}-'
            ).order_by('-project_code').first()
            
            if last_site and last_site.project_code:
                try:
                    last_number = int(last_site.project_code.split('-')[-1])
                    new_number = last_number + 1
                except (ValueError, IndexError):
                    new_number = 1
            else:
                new_number = 1
            
            # 既存のコードと重複しないようにチェック
            while True:
                new_code = f'PRJ-{year}-{new_number:04d}'
                if not ConstructionSite.objects.filter(project_code=new_code).exists():
                    self.project_code = new_code
                    break
                new_number += 1
        
        super().save(*args, **kwargs)
    
    def mark_as_completed(self, user):
        """現場を完成状態にする"""
        self.is_completed = True
        self.completion_date = timezone.now().date()
        self.completed_by = user
        self.save()
    
    def mark_as_cutoff(self, user, reason=''):
        """現場を打ち切り状態にする（新規請求書作成不可）"""
        self.is_cutoff = True
        self.cutoff_date = timezone.now().date()
        self.cutoff_by = user
        self.cutoff_reason = reason
        self.final_invoiced_amount = self.get_total_invoiced_amount()
        self.save()
        
        # 通知を送信
        if self.supervisor:
            SystemNotification.objects.create(
                recipient=self.supervisor,
                notification_type='alert',
                priority='high',
                title=f'【打ち切り】{self.name}',
                message=f'{self.name}が打ち切りになりました。\n\n'
                        f'打ち切り理由: {reason}\n'
                        f'最終請求累計額: ¥{self.final_invoiced_amount:,}',
                action_url=f'/sites/{self.id}'
            )
        
        return True
    
    def can_create_invoice(self, user=None):
        """新規請求書を作成できるか"""
        if self.is_cutoff:
            return False, "この現場は打ち切り済みのため、新規請求書を作成できません。"
        
        if self.is_completed:
            return False, "この現場は完成済みのため、新規請求書を作成できません。"
        
        if not self.is_active:
            return False, "この現場は無効状態のため、新規請求書を作成できません。"
        
        return True, None
    
    def reactivate(self, user):
        """打ち切りを解除"""
        if self.is_cutoff:
            self.is_cutoff = False
            self.cutoff_date = None
            self.cutoff_by = None
            self.cutoff_reason = ''
            self.final_invoiced_amount = 0
            self.save()
            return True
        return False
    
    def get_total_invoiced_amount(self):
        """この現場の累計請求額を取得"""
        from django.db.models import Sum
        return self.invoice_set.filter(
            status__in=['approved', 'paid', 'payment_preparing']
        ).aggregate(total=Sum('total_amount'))['total'] or 0
    
    def get_budget_consumption_rate(self):
        """予算消化率を計算（%）"""
        if self.total_budget == 0:
            return 0
        return round((self.get_total_invoiced_amount() / self.total_budget) * 100, 1)
    
    def is_budget_exceeded(self):
        """予算超過かどうか"""
        return self.get_budget_consumption_rate() > 100
    
    def is_budget_alert(self):
        """予算アラート状態かどうか"""
        return self.get_budget_consumption_rate() >= self.budget_alert_threshold
    
    def check_and_send_budget_alerts(self):
        """予算消化率をチェックし、必要に応じてアラートを送信"""
        if self.total_budget <= 0:
            return []
        
        rate = self.get_budget_consumption_rate()
        alerts_sent = []
        
        # 100%超過アラート
        if rate >= 100 and not self.budget_alert_100_notified:
            self._send_budget_alert(100, rate)
            self.budget_alert_100_notified = True
            alerts_sent.append(100)
        
        # 90%到達アラート
        elif rate >= 90 and not self.budget_alert_90_notified:
            self._send_budget_alert(90, rate)
            self.budget_alert_90_notified = True
            alerts_sent.append(90)
        
        # 80%到達アラート
        elif rate >= 80 and not self.budget_alert_80_notified:
            self._send_budget_alert(80, rate)
            self.budget_alert_80_notified = True
            alerts_sent.append(80)
        
        if alerts_sent:
            self.save()
        
        return alerts_sent
    
    def _send_budget_alert(self, threshold, current_rate):
        """予算アラート通知を送信"""
        # 現場監督に通知
        if self.supervisor:
            SystemNotification.objects.create(
                recipient=self.supervisor,
                notification_type='alert',
                priority='high' if threshold >= 100 else 'medium',
                title=f'【予算アラート】{self.name}',
                message=f'{self.name}の予算消化率が{threshold}%に到達しました。\n'
                        f'現在の消化率: {current_rate}%\n'
                        f'予算: ¥{self.total_budget:,}\n'
                        f'累計請求額: ¥{self.get_total_invoiced_amount():,}',
                action_url=f'/sites/{self.id}'
            )
    
    def reset_budget_alerts(self):
        """予算アラートをリセット（予算を変更した時に使用）"""
        self.budget_alert_80_notified = False
        self.budget_alert_90_notified = False
        self.budget_alert_100_notified = False
        self.save()


class Invoice(models.Model):
    """請求書マスター"""
    STATUS_CHOICES = [
        ('draft', '下書き'),
        ('submitted', '提出済み'),
        ('pending_approval', '承認待ち'),
        ('pending_batch_approval', '一斉承認待ち'),
        ('awaiting_partner_confirmation', '協力会社確認待ち'),
        ('approved', '承認済み'),
        ('rejected', '却下'),
        ('returned', '差し戻し'),
        ('payment_preparing', '支払い準備中'),
        ('paid', '支払い済み'),
    ]
    
    # 🆕 4.2 書類タイプ（請求書/納品書）
    DOCUMENT_TYPE_CHOICES = [
        ('invoice', '請求書'),
        ('delivery_note', '納品書'),
    ]
    
    # 基本情報
    invoice_number = models.CharField(max_length=50, unique=True, verbose_name="請求書番号", blank=True)
    unique_url = models.UUIDField(default=uuid.uuid4, unique=True, verbose_name="固有URL")
    unique_number = models.CharField(max_length=20, unique=True, verbose_name="管理番号", blank=True)
    
    # 🆕 4.2 書類タイプ
    document_type = models.CharField(
        max_length=20,
        choices=DOCUMENT_TYPE_CHOICES,
        default='invoice',
        verbose_name="書類タイプ"
    )
    
    # 🆕 特例パスワードによる作成フラグ（提出制限バイパス用）
    is_created_with_special_access = models.BooleanField(
        default=False,
        verbose_name="特例作成",
        help_text="特例パスワードを使用して作成されたかどうか"
    )
    
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
    
    # 工事現場
    construction_site = models.ForeignKey(
        ConstructionSite,
        on_delete=models.CASCADE,
        verbose_name="工事現場",
        null=True,
        blank=True
    )
    construction_site_name = models.CharField(
        max_length=100,
        verbose_name="工事現場名",
        blank=True
    )
    
    # 🆕 1.1 工種（15種類から選択 or その他）
    construction_type = models.ForeignKey(
        'ConstructionType',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name="工種"
    )
    construction_type_other = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="工種（その他）",
        help_text="工種が「その他」の場合に入力"
    )
    
    # 🆕 3.1 注文書との紐付け
    purchase_order = models.ForeignKey(
        'PurchaseOrder',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name="注文書"
    )
    
    # 金額
    subtotal = models.DecimalField(
        max_digits=15,
        decimal_places=0,
        default=Decimal('0'),
        verbose_name="小計"
    )
    tax_amount = models.DecimalField(
        max_digits=15,
        decimal_places=0,
        default=Decimal('0'),
        verbose_name="消費税"
    )
    total_amount = models.DecimalField(
        max_digits=15,
        decimal_places=0,
        default=Decimal('0'),
        verbose_name="合計金額"
    )
    template = models.ForeignKey(
        'InvoiceTemplate',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='invoices',
        verbose_name='テンプレート'
    )
    invoice_period = models.ForeignKey(
        'MonthlyInvoicePeriod',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='invoices',
        verbose_name='請求期間'
    )
    
    # 日付
    issue_date = models.DateField(verbose_name="発行日", null=True, blank=True)
    due_date = models.DateField(verbose_name="支払期日", null=True, blank=True)
    invoice_date = models.DateField(verbose_name="請求日", null=True, blank=True)
    payment_due_date = models.DateField(verbose_name="支払予定日", null=True, blank=True)
    
    # プロジェクト情報
    project_name = models.CharField(max_length=100, verbose_name="工事名", blank=True)
    project_code = models.CharField(max_length=50, verbose_name="工事コード", blank=True)
    department_code = models.CharField(max_length=20, verbose_name="部門コード", blank=True)
    notes = models.TextField(verbose_name="備考", blank=True)
    
    # ファイル
    file = models.FileField(upload_to='invoices/', verbose_name="請求書ファイル", blank=True)
    
    # ステータス・承認
    status = models.CharField(
        max_length=30,
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
    # 🆕 追加: 現在の承認者
    current_approver = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='pending_approvals',
        verbose_name="現在の承認者"
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
    
    # 🆕 2.1 受領・訂正期限管理
    received_at = models.DateTimeField(
        null=True, blank=True,
        verbose_name="受領日時",
        help_text="請求書を受領した日時"
    )
    correction_deadline = models.DateTimeField(
        null=True, blank=True,
        verbose_name="訂正期限",
        help_text="受領日時から2日後"
    )
    is_correction_allowed = models.BooleanField(
        default=True,
        verbose_name="訂正可能"
    )
    
    # 🆕 2.2 金額照合結果
    AMOUNT_CHECK_CHOICES = [
        ('not_checked', '未照合'),
        ('matched', '一致'),
        ('over', '上乗せあり'),
        ('under', '減額あり'),
        ('no_order', '注文書なし'),
    ]
    amount_check_result = models.CharField(
        max_length=20,
        choices=AMOUNT_CHECK_CHOICES,
        default='not_checked',
        verbose_name="金額照合結果"
    )
    amount_difference = models.DecimalField(
        max_digits=15, decimal_places=0, default=0,
        verbose_name="金額差異",
        help_text="請求額と注文書金額の差（正:上乗せ、負:減額）"
    )
    
    # 🆕 6.1 安全衛生協力会費
    safety_cooperation_fee = models.DecimalField(
        max_digits=15, decimal_places=0, default=0,
        verbose_name="安全衛生協力会費",
        help_text="10万円以上の場合、請求額の3/1000"
    )
    safety_fee_notified = models.BooleanField(
        default=False,
        verbose_name="協力会費通知済み"
    )
    
    # 🆕 1.3 一斉承認管理
    batch_approval_scheduled_at = models.DateTimeField(
        null=True, blank=True,
        verbose_name="一斉承認予定日時"
    )
    
    # 🆕 協力会社の修正制限
    is_returned = models.BooleanField(
        default=False,
        verbose_name="差し戻し済み"
    )
    can_partner_edit = models.BooleanField(
        default=True,
        verbose_name="協力会社編集可能",
        help_text="False: 協力会社は承認ボタンのみ（編集不可）"
    )
    has_corrections = models.BooleanField(
        default=False,
        verbose_name="修正あり",
        help_text="平野工務店側で赤ペン修正が行われた"
    )
    
    # 🆕 差し戻し承認用フィールド
    partner_acknowledged_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="協力会社承認日時"
    )
    partner_acknowledged_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='acknowledged_invoices',
        verbose_name="協力会社承認者"
    )
    return_reason = models.TextField(
        blank=True,
        verbose_name="差し戻し理由"
    )
    return_note = models.TextField(
        blank=True,
        verbose_name="差し戻し備考"
    )
    
    class Meta:
        verbose_name = "請求書"
        verbose_name_plural = "請求書一覧"
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.invoice_number} - {self.customer_company.name}"
    
    def calculate_totals(self):
        """小計・消費税・合計金額を計算"""
        self.subtotal = sum(int(item.amount) for item in self.items.all())
        self.tax_amount = int(self.subtotal * Decimal('0.1'))
        self.total_amount = self.subtotal + self.tax_amount
        self.save()
        return self.total_amount
    
    def save(self, *args, **kwargs):
        # 請求書番号の自動生成
        if not self.invoice_number:
            import datetime
            today = datetime.date.today()
            year = today.year
            
            # 書類タイプに応じたプレフィックス
            prefix = 'INV' if self.document_type == 'invoice' else 'DLV'
            
            last_invoice = Invoice.objects.filter(
                invoice_number__startswith=f'{prefix}-{year}-'
            ).order_by('-invoice_number').first()
            
            if last_invoice:
                try:
                    last_number = int(last_invoice.invoice_number.split('-')[-1])
                    new_number = last_number + 1
                except (ValueError, IndexError):
                    new_number = 1
            else:
                new_number = 1
            
            self.invoice_number = f'{prefix}-{year}-{new_number:04d}'
        
        # 管理番号の自動生成
        if not self.unique_number:
            year = self.created_at.year if self.created_at else timezone.now().year
            prefix = f'INV-{year}-'
            
            # count()ではなく、最新の番号を取得して+1する方式に変更（欠番対策）
            last_record = Invoice.objects.filter(
                unique_number__startswith=prefix
            ).order_by('-unique_number').first()
            
            if last_record and last_record.unique_number:
                try:
                    last_number = int(last_record.unique_number.split('-')[-1])
                    new_number = last_number + 1
                except (ValueError, IndexError):
                    new_number = Invoice.objects.filter(unique_number__startswith=prefix).count() + 1
            else:
                new_number = 1
            
            self.unique_number = f'{prefix}{str(new_number).zfill(3)}'
            
            # 安全策: 重複する場合はインクリメントし続ける
            while Invoice.objects.filter(unique_number=self.unique_number).exists():
                new_number += 1
                self.unique_number = f'{prefix}{str(new_number).zfill(3)}'
        
        # construction_site_nameを自動設定
        if self.construction_site and not self.construction_site_name:
            self.construction_site_name = self.construction_site.name
        
        # 日付フィールドの同期
        if self.invoice_date and not self.issue_date:
            self.issue_date = self.invoice_date
        elif self.issue_date and not self.invoice_date:
            self.invoice_date = self.issue_date
            
        if self.payment_due_date and not self.due_date:
            self.due_date = self.payment_due_date
        elif self.due_date and not self.payment_due_date:
            self.payment_due_date = self.due_date
        
        # 🆕 2.1 訂正期限の自動設定（受領日時から2日後）
        if self.received_at and not self.correction_deadline:
            self.correction_deadline = self.received_at + timedelta(days=2)
        
        # 🆕 訂正可能フラグの自動更新
        if self.correction_deadline:
            self.is_correction_allowed = timezone.now() <= self.correction_deadline
        
        # 🆕 6.1 安全衛生協力会費の自動計算（10万円以上の場合、3/1000）
        if self.total_amount >= 100000:
            self.safety_cooperation_fee = int(self.total_amount * Decimal('0.003'))
        else:
            self.safety_cooperation_fee = 0
        
        # 🆕 2.2 注文書との金額照合
        if self.purchase_order:
            order_amount = self.purchase_order.total_amount
            invoice_amount = self.total_amount
            
            if invoice_amount == order_amount:
                self.amount_check_result = 'matched'
                self.amount_difference = 0
            elif invoice_amount > order_amount:
                self.amount_check_result = 'over'
                self.amount_difference = invoice_amount - order_amount
            else:
                self.amount_check_result = 'under'
                self.amount_difference = invoice_amount - order_amount
        elif not self.purchase_order and self.amount_check_result == 'not_checked':
            self.amount_check_result = 'no_order'
        
        # 🆕 工種の使用回数をインクリメント
        if self.construction_type and self.pk is None:  # 新規作成時のみ
            self.construction_type.increment_usage()
        
        super().save(*args, **kwargs)
    
    def return_to_partner(self, user, comment='', reason='', note=''):
        """差し戻し処理"""
        self.status = 'returned'
        self.is_returned = True
        self.can_partner_edit = False  # 協力会社は編集不可
        self.return_reason = reason or comment
        self.return_note = note
        self.save()
        
        # 承認履歴に記録
        ApprovalHistory.objects.create(
            invoice=self,
            user=user,
            action='returned',
            comment=comment or reason
        )
        
        # 協力会社に通知
        partner_users = User.objects.filter(
            customer_company=self.customer_company,
            is_active=True
        )
        for partner_user in partner_users:
            SystemNotification.objects.create(
                recipient=partner_user,
                notification_type='alert',
                priority='high',
                title=f'【差し戻し】{self.invoice_number}',
                message=f'請求書が差し戻されました。差し戻し内容を確認し、承認してください。\n\n{reason or comment}',
                action_url=f'/invoices/{self.id}',
                related_invoice=self
            )
    
    def approve_corrections_by_partner(self, user):
        """協力会社が修正を承認（旧メソッド - 互換性のため残す）"""
        # 全ての修正を承認
        for correction in self.corrections.filter(is_approved_by_partner=False):
            correction.approve_by_partner()
        
        # ステータスを更新
        self.status = 'pending_approval'
        self.is_returned = False
        self.save()
        
        # 承認履歴に記録
        ApprovalHistory.objects.create(
            invoice=self,
            user=user,
            action='approved',
            comment='協力会社が修正内容を承認しました'
        )
    
    def acknowledge_return(self, user):
        """
        協力会社が差し戻し内容を承認（新メソッド）
        承認後は直接経理承認段階へ進む
        """
        if self.status != 'returned':
            raise ValueError("この請求書は差し戻し状態ではありません")

        # 協力会社ユーザーで、同じ協力会社所属または作成者本人かチェック
        is_same_company = (
            user.customer_company_id is not None
            and user.customer_company_id == self.customer_company_id
        )
        is_creator = self.created_by_id == user.id
        if user.user_type != 'customer' or not (is_same_company or is_creator):
            raise ValueError("権限がありません")
        
        # ステータスを経理承認待ちに直接変更
        self.status = 'pending_approval'
        self.partner_acknowledged_at = timezone.now()
        self.partner_acknowledged_by = user
        self.is_returned = False

        # 承認ステップを「経理確認」に直接設定（現場監督に戻さない）
        # 経理ステップは特定ユーザーに紐付けないため current_approver は None
        if self.approval_route:
            accountant_step = self.approval_route.steps.filter(
                approver_position='accountant'
            ).order_by('-step_order').first()
            if accountant_step:
                self.current_approval_step = accountant_step
                self.current_approver = None

        self.save()
        
        # 承認履歴に記録
        ApprovalHistory.objects.create(
            invoice=self,
            user=user,
            action='approved',
            comment='差し戻し内容を承認しました。経理承認段階へ進みます。'
        )
        
        # 経理担当者へ通知
        self._notify_accounting_team("差し戻し内容が承認されました")
        
        return self
    
    def partner_confirm_before_accountant(self, user):
        """
        常務承認後、協力会社が内容を確認して経理へ進める
        status: awaiting_partner_confirmation → pending_approval (accountant step)
        """
        if self.status != 'awaiting_partner_confirmation':
            raise ValueError("協力会社確認待ち状態の請求書のみ確認できます")

        is_same_company = (
            user.customer_company_id is not None
            and user.customer_company_id == self.customer_company_id
        )
        is_creator = self.created_by_id == user.id
        if user.user_type != 'customer' or not (is_same_company or is_creator):
            raise ValueError("権限がありません")

        self.status = 'pending_approval'
        self.save()

        ApprovalHistory.objects.create(
            invoice=self,
            user=user,
            action='approved',
            comment='協力会社が内容を確認しました。経理確認へ進みます。'
        )

        self._notify_accounting_team("協力会社の確認が完了しました")
        return self

    def supervisor_resubmit(self, user, comment=''):
        """
        差し戻し状態の請求書を現場所長が修正・再提出する。
        パートナーに戻さず、部長(step2)から承認フローを再開する。
        """
        if self.status != 'returned':
            raise ValueError("差し戻し状態の請求書のみ再提出できます")

        if not (self.construction_site and self.construction_site.supervisor == user):
            raise ValueError("この請求書の担当現場所長のみ再提出できます")

        if not self.approval_route:
            raise ValueError("承認ルートが設定されていません")

        # 部長ステップ（step_order=2）から再開
        dept_step = self.approval_route.steps.filter(
            approver_position='department_manager'
        ).first()
        if not dept_step:
            raise ValueError("部長承認ステップが見つかりません")

        dept_approver = User.objects.filter(
            user_type='internal',
            company=self.receiving_company,
            position='department_manager',
            is_active=True
        ).order_by('-id').first()

        self.status = 'pending_approval'
        self.is_returned = False
        self.current_approval_step = dept_step
        self.current_approver = dept_approver
        self.save()

        ApprovalHistory.objects.create(
            invoice=self,
            approval_step=dept_step,
            user=user,
            action='approved',
            comment=comment or '現場所長が修正し、部長承認へ再提出しました'
        )

        if dept_approver:
            SystemNotification.objects.create(
                recipient=dept_approver,
                notification_type='approval',
                priority='high',
                title=f'【承認依頼】{self.invoice_number}',
                message=f'現場所長による修正後の請求書が届いています。\n請求書番号: {self.invoice_number}',
                action_url=f'/invoices/{self.id}',
                related_invoice=self
            )
        return self

    def _notify_accounting_team(self, message):
        """経理担当者へ通知"""
        accounting_users = User.objects.filter(
            position='accountant',
            is_active=True
        )
        for accountant in accounting_users:
            SystemNotification.objects.create(
                recipient=accountant,
                notification_type='approval',
                priority='high',
                title=f'【承認通知】{self.invoice_number}',
                message=f'{self.customer_company.name}からの請求書が承認されました。\n\n{message}',
                action_url=f'/invoices/{self.id}',
                related_invoice=self
            )
    
    def can_user_download_pdf(self, user):
        """ユーザーがPDFをダウンロードできるかチェック"""
        # スーパーアドミンまたは経理のみ許可
        return (user.is_super_admin or 
                user.is_superuser or 
                user.position == 'accountant')


class InvoiceItem(models.Model):
    """請求明細モデル"""
    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.CASCADE,
        related_name='items',
        verbose_name="請求書"
    )
    item_number = models.IntegerField(verbose_name="項番")
    description = models.CharField(max_length=200, verbose_name="品名・摘要")
    quantity = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        verbose_name="数量"
    )
    unit = models.CharField(max_length=20, default='式', verbose_name="単位")
    unit_price = models.DecimalField(
        max_digits=15,
        decimal_places=0,
        validators=[MinValueValidator(Decimal('0'))],
        verbose_name="単価"
    )
    amount = models.DecimalField(
        max_digits=15,
        decimal_places=0,
        default=Decimal('0'),
        verbose_name="金額"
    )
    
    class Meta:
        verbose_name = "請求明細"
        verbose_name_plural = "請求明細一覧"
        ordering = ['item_number']
    
    def __str__(self):
        return f"{self.invoice.invoice_number} - {self.item_number}: {self.description}"
    
    def save(self, *args, **kwargs):
        """保存時に金額を自動計算"""
        self.amount = int(self.quantity * self.unit_price)
        super().save(*args, **kwargs)


# ==========================================
# 赤ペン修正機能（平野工務店側）
# ==========================================

class InvoiceCorrection(models.Model):
    """請求書の修正履歴（赤ペン機能）"""
    FIELD_TYPE_CHOICES = [
        ('amount', '金額'),
        ('quantity', '数量'),
        ('unit_price', '単価'),
        ('description', '品名・摘要'),
        ('other', 'その他'),
    ]
    
    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.CASCADE,
        related_name='corrections',
        verbose_name="請求書"
    )
    invoice_item = models.ForeignKey(
        InvoiceItem,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='corrections',
        verbose_name="請求明細"
    )
    field_name = models.CharField(max_length=100, verbose_name="修正フィールド名")
    field_type = models.CharField(
        max_length=20,
        choices=FIELD_TYPE_CHOICES,
        default='other',
        verbose_name="フィールド種別"
    )
    original_value = models.TextField(verbose_name="元の値")
    corrected_value = models.TextField(verbose_name="修正後の値")
    correction_reason = models.TextField(verbose_name="修正理由")
    corrected_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='invoice_corrections',
        verbose_name="修正者"
    )
    is_approved_by_partner = models.BooleanField(
        default=False,
        verbose_name="協力会社承認済み"
    )
    approved_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="承認日時"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="修正日時")
    
    class Meta:
        db_table = 'invoice_corrections'
        verbose_name = "請求書修正"
        verbose_name_plural = "請求書修正一覧"
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.invoice.invoice_number} - {self.field_name}: {self.original_value} → {self.corrected_value}"
    
    def apply_correction(self):
        """修正を実際に適用する"""
        if self.invoice_item and self.field_type in ['quantity', 'unit_price', 'description']:
            if self.field_type == 'quantity':
                self.invoice_item.quantity = Decimal(self.corrected_value)
            elif self.field_type == 'unit_price':
                self.invoice_item.unit_price = Decimal(self.corrected_value)
            elif self.field_type == 'description':
                self.invoice_item.description = self.corrected_value
            self.invoice_item.save()
            
            # 請求書の合計を再計算
            self.invoice.calculate_totals()
        
        # 請求書にフラグを設定
        self.invoice.has_corrections = True
        self.invoice.save()
    
    def approve_by_partner(self):
        """協力会社が修正を承認"""
        self.is_approved_by_partner = True
        self.approved_at = timezone.now()
        self.save()


class ApprovalHistory(models.Model):
    """承認履歴"""
    ACTION_CHOICES = [
        ('submitted', '提出'),
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
    
    # 🆕 スレッド対応（自己参照）
    parent_comment = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='replies',
        verbose_name="親コメント"
    )
    
    comment_type = models.CharField(
        max_length=20,
        choices=COMMENT_TYPE_CHOICES,
        default='general',
        verbose_name="コメント種別"
    )
    comment = models.TextField(verbose_name="コメント")
    is_private = models.BooleanField(default=False, verbose_name="社内限定")
    timestamp = models.DateTimeField(auto_now_add=True, verbose_name="投稿日時")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新日時")
    
    # メンション機能
    mentioned_users = models.ManyToManyField(
        User,
        related_name='mentioned_in_comments',
        blank=True,
        verbose_name="メンションされたユーザー"
    )
    
    class Meta:
        db_table = 'invoice_comments'
        verbose_name = "請求書コメント"
        verbose_name_plural = "請求書コメント一覧"
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['invoice', 'parent_comment']),
        ]
    
    def __str__(self):
        return f"{self.invoice.invoice_number} - {self.user} ({self.timestamp.strftime('%Y/%m/%d %H:%M')})"
    
    def is_reply(self):
        """返信かどうか"""
        return self.parent_comment is not None
    
    def get_thread_root(self):
        """スレッドのルートコメントを取得"""
        current = self
        while current.parent_comment:
            current = current.parent_comment
        return current
    
    def get_all_replies(self):
        """すべての返信を再帰的に取得"""
        replies = list(self.replies.all())
        for reply in list(replies):
            replies.extend(reply.get_all_replies())
        return replies
    
    def parse_mentions(self):
        """コメントから@メンションを解析し、通知を送信"""
        import re
        # @ユーザー名 形式を検索
        mentions = re.findall(r'@(\w+)', self.comment)
        
        mentioned_users = []
        for username in mentions:
            try:
                mentioned_user = User.objects.get(username=username)
                mentioned_users.append(mentioned_user)
                
                # 通知を送信
                SystemNotification.objects.create(
                    recipient=mentioned_user,
                    notification_type='info',
                    priority='medium',
                    title=f'{self.user.get_full_name()}さんからメンションされました',
                    message=f'請求書 {self.invoice.invoice_number} のコメントでメンションされました。\n\n「{self.comment[:100]}{"..." if len(self.comment) > 100 else ""}」',
                    action_url=f'/invoices/{self.invoice.id}',
                    related_invoice=self.invoice
                )
            except User.DoesNotExist:
                continue
        
        # メンションされたユーザーを保存
        if mentioned_users:
            self.mentioned_users.set(mentioned_users)
        
        return mentioned_users
    
    # ==========================================
# Phase 2: 顧客向け機能 - モデル追加
# ==========================================
# このコードを既存のmodels.pyの最後に追加してください

import uuid
from datetime import timedelta


# ==========================================
# 1. 請求書テンプレートシステム
# ==========================================

class InvoiceTemplate(models.Model):
    """請求書テンプレート - 業種別テンプレート管理"""
    name = models.CharField('テンプレート名', max_length=100)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, verbose_name='会社')
    description = models.TextField('説明', blank=True)
    is_active = models.BooleanField('有効', default=True)
    is_default = models.BooleanField('デフォルト', default=False)
    created_at = models.DateTimeField('作成日時', auto_now_add=True)
    updated_at = models.DateTimeField('更新日時', auto_now=True)

    class Meta:
        db_table = 'invoice_templates'
        verbose_name = '請求書テンプレート'
        verbose_name_plural = '請求書テンプレート'
        ordering = ['-is_default', '-created_at']

    def __str__(self):
        return f"{self.company.name} - {self.name}"

    def save(self, *args, **kwargs):
        # デフォルトテンプレートは1つだけ
        if self.is_default:
            InvoiceTemplate.objects.filter(
                company=self.company,
                is_default=True
            ).update(is_default=False)
        super().save(*args, **kwargs)


class TemplateField(models.Model):
    """テンプレートフィールド定義 - カスタムフィールド用"""
    FIELD_TYPE_CHOICES = [
        ('text', 'テキスト'),
        ('number', '数値'),
        ('date', '日付'),
        ('select', '選択'),
        ('textarea', 'テキストエリア'),
    ]

    template = models.ForeignKey(
        InvoiceTemplate,
        on_delete=models.CASCADE,
        related_name='fields',
        verbose_name='テンプレート'
    )
    field_name = models.CharField('フィールド名', max_length=100)
    field_type = models.CharField('フィールドタイプ', max_length=20, choices=FIELD_TYPE_CHOICES)
    is_required = models.BooleanField('必須', default=False)
    default_value = models.CharField('デフォルト値', max_length=200, blank=True)
    display_order = models.IntegerField('表示順', default=0)
    help_text = models.CharField('ヘルプテキスト', max_length=200, blank=True)
    
    # 選択肢（selectタイプの場合、カンマ区切り）
    choices = models.TextField('選択肢', blank=True, help_text='カンマ区切り (例: 銀行振込,現金,小切手)')

    class Meta:
        db_table = 'template_fields'
        verbose_name = 'テンプレートフィールド'
        verbose_name_plural = 'テンプレートフィールド'
        ordering = ['display_order', 'id']

    def __str__(self):
        return f"{self.template.name} - {self.field_name}"


# ==========================================
# 2. 月次請求期間管理（締め処理）- 25日締め、翌月末必着
# ==========================================

class MonthlyInvoicePeriod(models.Model):
    """
    月次請求期間管理 - 25日締め、翌月末必着ルール
    
    例：11月分の請求書
    - 対象期間: 10/26 ～ 11/25
    - 提出可能期間: 11/26 00:00 ～ 12/31 23:59
    - 12/31 23:59を過ぎると提出不可
    """
    company = models.ForeignKey(Company, on_delete=models.CASCADE, verbose_name='会社')
    year = models.IntegerField('年')
    month = models.IntegerField('月', help_text='1-12')
    
    # 対象期間（前月26日～当月25日）
    period_start_date = models.DateField('対象期間開始日', help_text='前月26日', null=True, blank=True)
    period_end_date = models.DateField('対象期間終了日', help_text='当月25日（締日）', null=True, blank=True)
    
    # 提出可能期間（当月26日～翌月末日）
    submission_start_date = models.DateField('提出開始日', help_text='当月26日', null=True, blank=True)
    submission_deadline = models.DateField('提出期限', help_text='翌月末日（必着）', null=True, blank=True)
    
    # 旧フィールド（互換性のため残す）
    deadline_date = models.DateField('締切日')
    
    is_closed = models.BooleanField('締め済み', default=False)
    closed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='closed_periods',
        verbose_name='締め実行者'
    )
    closed_at = models.DateTimeField('締め日時', null=True, blank=True)
    notes = models.TextField('備考', blank=True)
    created_at = models.DateTimeField('作成日時', auto_now_add=True)
    
    # 繰越関連
    has_carryover = models.BooleanField('繰越あり', default=False)
    carryover_amount = models.DecimalField(
        '繰越金額', max_digits=15, decimal_places=0, default=0
    )
    carryover_reason = models.TextField('繰越理由', blank=True)
    
    # 🆕 特例パスワード（締切後の提出用）
    special_access_password = models.CharField(
        '特例パスワード',
        max_length=100,
        blank=True,
        help_text='締切を過ぎた後に請求書を提出する際の特例パスワード'
    )
    special_access_expiry = models.DateField(
        '特例有効期限',
        null=True,
        blank=True,
        help_text='このパスワードが有効な期限'
    )
    
    previous_period = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='next_periods',
        verbose_name='前期間'
    )

    class Meta:
        db_table = 'monthly_invoice_periods'
        verbose_name = '月次請求期間'
        verbose_name_plural = '月次請求期間'
        unique_together = ['company', 'year', 'month']
        ordering = ['-year', '-month']

    def __str__(self):
        status = '締め済み' if self.is_closed else '受付中'
        return f"{self.company.name} - {self.year}年{self.month}月 ({status})"

    @property
    def period_name(self):
        """期間名（例: 2024年10月分）"""
        return f"{self.year}年{self.month}月分"

    @property
    def is_past_deadline(self):
        """締切を過ぎているか"""
        return timezone.now().date() > self.deadline_date
    
    @property
    def is_submission_allowed(self):
        """提出可能期間内か"""
        if not self.submission_start_date or not self.submission_deadline:
            # 新しいフィールドがまだ設定されていない場合は旧ロジックを使用
            return not self.is_past_deadline
        today = timezone.now().date()
        return self.submission_start_date <= today <= self.submission_deadline
    
    @property
    def submission_status(self):
        """提出ステータス"""
        if not self.submission_start_date or not self.submission_deadline:
            return 'open' if not self.is_closed else 'closed'
        today = timezone.now().date()
        if today < self.submission_start_date:
            return 'not_yet'  # まだ提出期間前
        elif today <= self.submission_deadline:
            return 'open'  # 提出受付中
        else:
            return 'closed'  # 提出期間終了
    
    @property
    def days_until_deadline(self):
        """締切までの日数"""
        today = timezone.now().date()
        deadline = self.submission_deadline or self.deadline_date
        if not deadline:
            return 0
        return (deadline - today).days
    
    def can_submit_invoice(self, user=None):
        """請求書を提出できるか"""
        if self.is_closed:
            return False, "この期間は既に締め処理が完了しています。"
        
        # スーパーアドミンは期限外でも提出可能
        if user and user.is_super_admin:
            return True, None
        
        today = timezone.now().date()
        
        # 新しいフィールドがある場合は厳密なチェック
        if self.submission_start_date and self.submission_deadline:
            if today < self.submission_start_date:
                return False, f"提出期間は{self.submission_start_date.strftime('%Y年%m月%d日')}からです。"
            
            if today > self.submission_deadline:
                return False, (
                    f"申し訳ございませんが、提出期限（{self.submission_deadline.strftime('%Y年%m月%d日')}）を過ぎたため、"
                    "本請求書は提出できません。経理部門までお問い合わせください。"
                )
        else:
            # 旧形式の場合
            if self.deadline_date and today > self.deadline_date:
                return False, "提出期限を過ぎています。経理部門までお問い合わせください。"
        
        return True, None

    def close_period(self, user):
        """期間を締める - 提出済み請求書を一斉に承認待ちへ"""
        self.is_closed = True
        self.closed_by = user
        self.closed_at = timezone.now()
        self.save()

        # Batch Approval Logic: "submitted" -> "pending_approval"
        # Invoice IS defined before MonthlyInvoicePeriod in this file, so we can use it directly.
        
        # この期間に紐づく提出済み請求書のみ対象（他月の請求書を巻き込まない）
        invoices = Invoice.objects.filter(
            invoice_period=self,
            receiving_company=self.company,
            status='submitted'
        )
        
        processed_count = 0
        for invoice in invoices:
            if invoice.construction_site and invoice.construction_site.supervisor:
                invoice.status = 'pending_approval'
                invoice.current_approver = invoice.construction_site.supervisor
                invoice.save()
                
                # History log
                ApprovalHistory.objects.create(
                    invoice=invoice,
                    user=user, # The user who closed the period
                    action='submitted', # Reuse submitted or use a new one. Let's use 'submitted' to imply it's now properly submitted to flow.
                    comment='締め処理により承認フローが開始されました'
                )
                processed_count += 1
                
        return processed_count


    def reopen_period(self):
        """期間を再開する"""
        self.is_closed = False
        self.closed_by = None
        self.closed_at = None
        self.save()
    
    def create_carryover(self, amount, reason=''):
        """繰越を作成"""
        self.has_carryover = True
        self.carryover_amount = amount
        self.carryover_reason = reason
        self.save()
        return self
    
    @classmethod
    def create_for_month(cls, company, year, month):
        """指定月の期間を自動生成（25日締め、受付は当月26日〜末日）"""
        import calendar
        from datetime import date

        # 前月の26日を計算
        if month == 1:
            prev_year, prev_month = year - 1, 12
        else:
            prev_year, prev_month = year, month - 1
        period_start = date(prev_year, prev_month, 26)

        # 当月25日（締日）
        period_end = date(year, month, 25)
        deadline = period_end

        # 当月26日（提出開始）
        submission_start = date(year, month, 26)

        # 当月末日（提出期限）
        last_day = calendar.monthrange(year, month)[1]
        submission_deadline = date(year, month, last_day)
        
        period, created = cls.objects.get_or_create(
            company=company,
            year=year,
            month=month,
            defaults={
                'period_start_date': period_start,
                'period_end_date': period_end,
                'submission_start_date': submission_start,
                'submission_deadline': submission_deadline,
                'deadline_date': deadline,
            }
        )
        
        return period, created


# ==========================================
# 3. カスタムフィールド（将来の拡張用）
# ==========================================

class CustomField(models.Model):
    """カスタムフィールド定義"""
    FIELD_TYPE_CHOICES = [
        ('text', 'テキスト'),
        ('number', '数値'),
        ('date', '日付'),
        ('select', '選択'),
        ('checkbox', 'チェックボックス'),
    ]

    company = models.ForeignKey(Company, on_delete=models.CASCADE, verbose_name='会社')
    field_name = models.CharField('フィールド名', max_length=100)
    field_type = models.CharField('フィールドタイプ', max_length=20, choices=FIELD_TYPE_CHOICES)
    is_required = models.BooleanField('必須', default=False)
    is_active = models.BooleanField('有効', default=True)
    display_order = models.IntegerField('表示順', default=0)
    help_text = models.CharField('ヘルプテキスト', max_length=200, blank=True)

    class Meta:
        db_table = 'custom_fields'
        verbose_name = 'カスタムフィールド'
        verbose_name_plural = 'カスタムフィールド'
        ordering = ['display_order', 'id']

    def __str__(self):
        return f"{self.company.name} - {self.field_name}"


class CustomFieldValue(models.Model):
    """カスタムフィールド値"""
    invoice = models.ForeignKey(
        'Invoice',
        on_delete=models.CASCADE,
        related_name='custom_values',
        verbose_name='請求書'
    )
    custom_field = models.ForeignKey(
        CustomField,
        on_delete=models.CASCADE,
        verbose_name='カスタムフィールド'
    )
    value = models.TextField('値')

    class Meta:
        db_table = 'custom_field_values'
        verbose_name = 'カスタムフィールド値'
        verbose_name_plural = 'カスタムフィールド値'
        unique_together = ['invoice', 'custom_field']

    def __str__(self):
        return f"{self.invoice.invoice_number} - {self.custom_field.field_name}: {self.value}"


# ==========================================
# 4. PDF生成履歴（オプション）
# ==========================================

class PDFGenerationLog(models.Model):
    """PDF生成履歴"""
    invoice = models.ForeignKey(
        'Invoice',
        on_delete=models.CASCADE,
        related_name='pdf_logs',
        verbose_name='請求書'
    )
    generated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, verbose_name='生成者')
    generated_at = models.DateTimeField('生成日時', auto_now_add=True)
    file_size = models.IntegerField('ファイルサイズ(bytes)', null=True, blank=True)

    class Meta:
        db_table = 'pdf_generation_logs'
        verbose_name = 'PDF生成履歴'
        verbose_name_plural = 'PDF生成履歴'
        ordering = ['-generated_at']

    def __str__(self):
        return f"{self.invoice.invoice_number} - {self.generated_at.strftime('%Y-%m-%d %H:%M')}"


# ==========================================
# 既存のInvoiceモデルに追加するフィールド
# ==========================================
# ※ これは既存のInvoiceモデル内に追加してください

# Invoice モデルに以下のフィールドを追加:
# template = models.ForeignKey(
#     InvoiceTemplate,
#     on_delete=models.SET_NULL,
#     null=True,
#     blank=True,
#     verbose_name='テンプレート'
# )
# invoice_period = models.ForeignKey(
#     MonthlyInvoicePeriod,
#     on_delete=models.SET_NULL,
#     null=True,
#     blank=True,
#     verbose_name='請求期間'
# )


# ==========================================
# 3.1 注文書管理
# ==========================================

class PurchaseOrder(models.Model):
    """注文書マスター"""
    STATUS_CHOICES = [
        ('draft', '下書き'),
        ('issued', '発行済み'),
        ('accepted', '受諾済み'),
        ('completed', '完了'),
        ('cancelled', 'キャンセル'),
    ]
    
    order_number = models.CharField(max_length=50, unique=True, verbose_name="注文書番号")
    
    # 発注先
    customer_company = models.ForeignKey(
        CustomerCompany,
        on_delete=models.CASCADE,
        verbose_name="発注先会社"
    )
    
    # 発注元
    issuing_company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        verbose_name="発注元会社"
    )
    
    # 工事現場
    construction_site = models.ForeignKey(
        ConstructionSite,
        on_delete=models.CASCADE,
        verbose_name="工事現場"
    )
    
    # 工種
    construction_type = models.ForeignKey(
        ConstructionType,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name="工種"
    )
    
    # 金額
    subtotal = models.DecimalField(
        max_digits=15, decimal_places=0, default=0,
        verbose_name="小計"
    )
    tax_amount = models.DecimalField(
        max_digits=15, decimal_places=0, default=0,
        verbose_name="消費税"
    )
    total_amount = models.DecimalField(
        max_digits=15, decimal_places=0, default=0,
        verbose_name="合計金額"
    )
    
    # 日付
    issue_date = models.DateField(verbose_name="発行日")
    delivery_date = models.DateField(null=True, blank=True, verbose_name="納期")
    
    # ステータス
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='draft',
        verbose_name="ステータス"
    )
    
    # PDF
    pdf_file = models.FileField(
        upload_to='purchase_orders/',
        blank=True,
        verbose_name="注文書PDF"
    )
    
    # 備考
    notes = models.TextField(blank=True, verbose_name="備考")
    
    # 作成情報
    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='created_orders',
        verbose_name="作成者"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'purchase_orders'
        verbose_name = "注文書"
        verbose_name_plural = "注文書一覧"
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.order_number} - {self.customer_company.name}"
    
    def get_invoiced_amount(self):
        """この注文書に紐づく請求総額"""
        from django.db.models import Sum
        return self.invoice_set.aggregate(total=Sum('total_amount'))['total'] or 0
    
    def get_remaining_amount(self):
        """残額（注文金額 - 請求済み金額）"""
        return self.total_amount - self.get_invoiced_amount()
    
    def verify_invoice_amount(self, invoice_amount):
        """
        請求額と注文書金額を照合
        
        Returns:
            tuple: (result, difference, requires_additional_approval)
            result: 'matched' | 'over' | 'under' | 'exceeds_order'
            difference: 差額（正:上乗せ、負:減額）
            requires_additional_approval: 追加承認が必要か
        """
        order_amount = self.total_amount
        difference = invoice_amount - order_amount
        
        if invoice_amount == order_amount:
            return 'matched', 0, False
        elif invoice_amount > order_amount:
            # 上乗せ請求 → 追加承認ルート起動
            return 'over', difference, True
        else:
            # 減額 → 通常フロー
            return 'under', difference, False
    
    def get_usage_rate(self):
        """注文金額使用率（%）"""
        if self.total_amount == 0:
            return 0
        return round((self.get_invoiced_amount() / self.total_amount) * 100, 1)
    
    def is_fully_invoiced(self):
        """注文金額を使い切ったか"""
        return self.get_invoiced_amount() >= self.total_amount
    
    def get_alert_status(self):
        """アラートステータスを取得"""
        rate = self.get_usage_rate()
        if rate >= 100:
            return 'exceeded', '注文金額超過'
        elif rate >= 90:
            return 'warning', '残額わずか'
        elif rate >= 80:
            return 'caution', '80%以上使用'
        return 'normal', '正常'


class PurchaseOrderItem(models.Model):
    """注文書明細"""
    purchase_order = models.ForeignKey(
        PurchaseOrder,
        on_delete=models.CASCADE,
        related_name='items',
        verbose_name="注文書"
    )
    item_number = models.IntegerField(verbose_name="項番")
    description = models.CharField(max_length=200, verbose_name="品名・摘要")
    quantity = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="数量")
    unit = models.CharField(max_length=20, default='式', verbose_name="単位")
    unit_price = models.DecimalField(max_digits=15, decimal_places=0, verbose_name="単価")
    amount = models.DecimalField(max_digits=15, decimal_places=0, verbose_name="金額")
    
    class Meta:
        db_table = 'purchase_order_items'
        verbose_name = "注文書明細"
        verbose_name_plural = "注文書明細一覧"
        ordering = ['item_number']
    
    def __str__(self):
        return f"{self.purchase_order.order_number} - {self.item_number}: {self.description}"


# ==========================================
# 2.3 変更履歴の可視化
# ==========================================

class InvoiceChangeHistory(models.Model):
    """請求書変更履歴"""
    CHANGE_TYPE_CHOICES = [
        ('created', '作成'),
        ('updated', '更新'),
        ('amount_changed', '金額変更'),
        ('status_changed', 'ステータス変更'),
        ('item_added', '明細追加'),
        ('item_removed', '明細削除'),
        ('item_modified', '明細変更'),
        ('correction', '訂正'),
    ]
    
    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.CASCADE,
        related_name='change_histories',
        verbose_name="請求書"
    )
    change_type = models.CharField(
        max_length=30,
        choices=CHANGE_TYPE_CHOICES,
        verbose_name="変更種別"
    )
    field_name = models.CharField(max_length=100, blank=True, verbose_name="変更フィールド")
    old_value = models.TextField(blank=True, verbose_name="変更前の値")
    new_value = models.TextField(blank=True, verbose_name="変更後の値")
    change_reason = models.TextField(verbose_name="変更理由")
    changed_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        verbose_name="変更者"
    )
    changed_at = models.DateTimeField(auto_now_add=True, verbose_name="変更日時")
    
    class Meta:
        db_table = 'invoice_change_histories'
        verbose_name = "請求書変更履歴"
        verbose_name_plural = "請求書変更履歴一覧"
        ordering = ['-changed_at']
    
    def __str__(self):
        return f"{self.invoice.invoice_number} - {self.get_change_type_display()} ({self.changed_at.strftime('%Y/%m/%d %H:%M')})"


# ==========================================
# 8.1 アクセスログ（セキュリティ）
# ==========================================

class AccessLog(models.Model):
    """アクセスログ"""
    ACTION_CHOICES = [
        ('login', 'ログイン'),
        ('logout', 'ログアウト'),
        ('view', '閲覧'),
        ('create', '作成'),
        ('update', '更新'),
        ('delete', '削除'),
        ('download', 'ダウンロード'),
        ('export', 'エクスポート'),
        ('approve', '承認'),
        ('reject', '却下'),
    ]
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        verbose_name="ユーザー"
    )
    action = models.CharField(max_length=20, choices=ACTION_CHOICES, verbose_name="アクション")
    resource_type = models.CharField(max_length=50, verbose_name="リソース種別")
    resource_id = models.CharField(max_length=50, blank=True, verbose_name="リソースID")
    ip_address = models.GenericIPAddressField(null=True, blank=True, verbose_name="IPアドレス")
    user_agent = models.TextField(blank=True, verbose_name="ユーザーエージェント")
    details = models.JSONField(default=dict, blank=True, verbose_name="詳細情報")
    timestamp = models.DateTimeField(auto_now_add=True, verbose_name="日時")
    
    class Meta:
        db_table = 'access_logs'
        verbose_name = "アクセスログ"
        verbose_name_plural = "アクセスログ一覧"
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['user', 'timestamp']),
            models.Index(fields=['action', 'timestamp']),
            models.Index(fields=['resource_type', 'resource_id']),
        ]
    
    def __str__(self):
        return f"{self.user.username} - {self.get_action_display()} - {self.timestamp.strftime('%Y/%m/%d %H:%M')}"
    
    @classmethod
    def log(cls, user, action, resource_type, resource_id='', ip_address=None, user_agent='', details=None):
        """アクセスログを記録するヘルパーメソッド"""
        return cls.objects.create(
            user=user,
            action=action,
            resource_type=resource_type,
            resource_id=str(resource_id),
            ip_address=ip_address,
            user_agent=user_agent,
            details=details or {}
        )


# ==========================================
# 8.2 システム通知
# ==========================================

class SystemNotification(models.Model):
    """システム通知"""
    NOTIFICATION_TYPE_CHOICES = [
        ('reminder', 'リマインド'),
        ('deadline', '期限通知'),
        ('approval', '承認通知'),
        ('alert', 'アラート'),
        ('info', '情報'),
    ]
    
    PRIORITY_CHOICES = [
        ('low', '低'),
        ('medium', '中'),
        ('high', '高'),
    ]
    
    recipient = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='notifications',
        verbose_name="受信者"
    )
    notification_type = models.CharField(
        max_length=20,
        choices=NOTIFICATION_TYPE_CHOICES,
        default='info',
        verbose_name="通知種別"
    )
    priority = models.CharField(
        max_length=10,
        choices=PRIORITY_CHOICES,
        default='medium',
        verbose_name="優先度"
    )
    title = models.CharField(max_length=200, verbose_name="タイトル")
    message = models.TextField(verbose_name="メッセージ")
    action_url = models.CharField(max_length=500, blank=True, verbose_name="アクションURL")
    
    # 関連リソース
    related_invoice = models.ForeignKey(
        Invoice,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        verbose_name="関連請求書"
    )
    
    is_read = models.BooleanField(default=False, verbose_name="既読")
    read_at = models.DateTimeField(null=True, blank=True, verbose_name="既読日時")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="作成日時")
    
    class Meta:
        db_table = 'system_notifications'
        verbose_name = "システム通知"
        verbose_name_plural = "システム通知一覧"
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.recipient.username} - {self.title}"
    
    def mark_as_read(self):
        """既読にする"""
        self.is_read = True
        self.read_at = timezone.now()
        self.save()


# ==========================================
# 1.2-1.3 月次締め処理の拡張
# ==========================================

class BatchApprovalSchedule(models.Model):
    """一斉承認スケジュール（1.3 請求書受領期限管理）"""
    period = models.ForeignKey(
        MonthlyInvoicePeriod,
        on_delete=models.CASCADE,
        related_name='batch_schedules',
        verbose_name="請求期間"
    )
    scheduled_datetime = models.DateTimeField(verbose_name="一斉承認予定日時")
    is_executed = models.BooleanField(default=False, verbose_name="実行済み")
    executed_at = models.DateTimeField(null=True, blank=True, verbose_name="実行日時")
    executed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name="実行者"
    )
    target_supervisor_count = models.IntegerField(default=0, verbose_name="対象監督者数")
    target_invoice_count = models.IntegerField(default=0, verbose_name="対象請求書数")
    notes = models.TextField(blank=True, verbose_name="備考")
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'batch_approval_schedules'
        verbose_name = "一斉承認スケジュール"
        verbose_name_plural = "一斉承認スケジュール一覧"
        ordering = ['-scheduled_datetime']
    
    def __str__(self):
        return f"{self.period.period_name} - {self.scheduled_datetime.strftime('%Y/%m/%d %H:%M')}"
    
    def execute(self, executed_by):
        """一斉承認を実行"""
        if self.is_executed:
            return False, "既に実行済みです"
        
        # 対象の請求書を取得（pending_batch_approval状態のもの）
        invoices = Invoice.objects.filter(
            invoice_period=self.period,
            status='pending_batch_approval'
        )
        
        # 各請求書の承認フローを開始
        for invoice in invoices:
            invoice.status = 'pending_approval'
            invoice.batch_approval_scheduled_at = None
            invoice.save()
            
            # 通知を送信
            if invoice.construction_site and invoice.construction_site.supervisor:
                SystemNotification.objects.create(
                    recipient=invoice.construction_site.supervisor,
                    notification_type='approval',
                    priority='high',
                    title=f'【一斉承認】{invoice.invoice_number}',
                    message=f'{invoice.customer_company.name}からの請求書が承認待ちになりました。',
                    action_url=f'/invoices/{invoice.id}',
                    related_invoice=invoice
                )
        
        self.is_executed = True
        self.executed_at = timezone.now()
        self.executed_by = executed_by
        self.target_invoice_count = invoices.count()
        self.save()
        
        return True, f"{invoices.count()}件の請求書を承認待ち状態にしました"


# ==========================================
# 予算管理（月別）
# ==========================================

class Budget(models.Model):
    """予算管理 - 工事ごとの月別予算"""
    project = models.ForeignKey(
        ConstructionSite,
        on_delete=models.CASCADE,
        related_name='budgets',
        verbose_name="工事現場"
    )
    budget_year = models.IntegerField(verbose_name="予算年度")
    budget_month = models.IntegerField(
        verbose_name="予算月",
        null=True,
        blank=True,
        help_text="NULLの場合は年間予算"
    )
    budget_amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=0,
        verbose_name="予算金額"
    )
    allocated_amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=0,
        verbose_name="配賦済み金額"
    )
    remaining_amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=0,
        verbose_name="残予算"
    )
    notes = models.TextField(verbose_name="備考", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'budgets'
        verbose_name = "予算"
        verbose_name_plural = "予算一覧"
        unique_together = ['project', 'budget_year', 'budget_month']
        ordering = ['-budget_year', '-budget_month']
        indexes = [
            models.Index(fields=['project', 'budget_year']),
        ]
    
    def __str__(self):
        if self.budget_month:
            return f"{self.project.name} - {self.budget_year}年{self.budget_month}月"
        return f"{self.project.name} - {self.budget_year}年度"
    
    def save(self, *args, **kwargs):
        # 残予算を自動計算
        self.remaining_amount = self.budget_amount - self.allocated_amount
        super().save(*args, **kwargs)
    
    def update_allocated_amount(self):
        """配賦済み金額を請求書から計算"""
        from django.db.models import Sum
        from django.db.models.functions import ExtractYear, ExtractMonth
        
        invoices = Invoice.objects.filter(
            construction_site=self.project,
            status__in=['approved', 'paid', 'payment_preparing']
        )
        
        if self.budget_month:
            # 月別の場合
            invoices = invoices.annotate(
                inv_year=ExtractYear('invoice_date'),
                inv_month=ExtractMonth('invoice_date')
            ).filter(
                inv_year=self.budget_year,
                inv_month=self.budget_month
            )
        else:
            # 年度の場合（4月〜翌3月）
            invoices = invoices.filter(
                invoice_date__gte=f'{self.budget_year}-04-01',
                invoice_date__lt=f'{self.budget_year + 1}-04-01'
            )
        
        total = invoices.aggregate(total=Sum('total_amount'))['total'] or 0
        self.allocated_amount = total
        self.save()
        return total


# ==========================================
# 安全衛生協力会費（詳細記録用）
# ==========================================

class SafetyFee(models.Model):
    """安全衛生協力会費 - 詳細記録"""
    invoice = models.OneToOneField(
        Invoice,
        on_delete=models.CASCADE,
        related_name='safety_fee_detail',
        verbose_name="請求書"
    )
    base_amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=0,
        verbose_name="対象金額"
    )
    fee_rate = models.DecimalField(
        max_digits=5,
        decimal_places=4,
        default=Decimal('0.0030'),
        verbose_name="会費率",
        help_text="3/1000 = 0.003"
    )
    fee_amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=0,
        verbose_name="会費金額"
    )
    notification_sent = models.BooleanField(default=False, verbose_name="通知送信済み")
    notification_sent_at = models.DateTimeField(null=True, blank=True, verbose_name="通知送信日時")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'safety_fees'
        verbose_name = "安全衛生協力会費"
        verbose_name_plural = "安全衛生協力会費一覧"
    
    def __str__(self):
        return f"{self.invoice.invoice_number} - ¥{self.fee_amount:,.0f}"
    
    def calculate_fee(self):
        """会費を計算"""
        if self.base_amount >= 100000:
            self.fee_amount = self.base_amount * self.fee_rate
        else:
            self.fee_amount = 0
        self.save()
        return self.fee_amount
    
    def send_notification(self):
        """協力会社に通知を送信"""
        if self.notification_sent:
            return False
        
        # 協力会社ユーザーに通知
        partner_users = User.objects.filter(
            customer_company=self.invoice.customer_company,
            is_active=True
        )
        
        for user in partner_users:
            SystemNotification.objects.create(
                recipient=user,
                notification_type='info',
                priority='medium',
                title=f'【安全衛生協力会費のお知らせ】{self.invoice.invoice_number}',
                message=f'請求書 {self.invoice.invoice_number} に対する安全衛生協力会費のお知らせです。\n\n'
                        f'対象金額: ¥{self.base_amount:,.0f}\n'
                        f'会費率: {float(self.fee_rate) * 100:.2f}%\n'
                        f'協力会費: ¥{self.fee_amount:,.0f}\n\n'
                        f'この金額がお支払いから控除されます。',
                action_url=f'/invoices/{self.invoice.id}',
                related_invoice=self.invoice
            )
        
        self.notification_sent = True
        self.notification_sent_at = timezone.now()
        self.save()
        return True


# ==========================================
# 添付ファイル管理
# ==========================================

class FileAttachment(models.Model):
    """添付ファイル管理"""
    FILE_TYPE_CHOICES = [
        ('pdf', 'PDF'),
        ('image', '画像'),
        ('excel', 'Excel'),
        ('word', 'Word'),
        ('other', 'その他'),
    ]
    
    # 関連先（どちらか一方を設定）
    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='attachments',
        verbose_name="請求書"
    )
    purchase_order = models.ForeignKey(
        'PurchaseOrder',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='attachments',
        verbose_name="注文書"
    )
    
    file_name = models.CharField(max_length=255, verbose_name="ファイル名")
    file_path = models.FileField(upload_to='attachments/%Y/%m/', verbose_name="ファイル")
    file_type = models.CharField(
        max_length=20,
        choices=FILE_TYPE_CHOICES,
        default='other',
        verbose_name="ファイルタイプ"
    )
    file_size = models.BigIntegerField(default=0, verbose_name="ファイルサイズ(bytes)")
    mime_type = models.CharField(max_length=100, blank=True, verbose_name="MIMEタイプ")
    
    uploaded_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        verbose_name="アップロード者"
    )
    description = models.TextField(blank=True, verbose_name="説明")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="作成日時")
    
    class Meta:
        db_table = 'file_attachments'
        verbose_name = "添付ファイル"
        verbose_name_plural = "添付ファイル一覧"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['invoice', 'purchase_order']),
        ]
    
    def __str__(self):
        return self.file_name
    
    def save(self, *args, **kwargs):
        # ファイルサイズを自動設定
        if self.file_path and hasattr(self.file_path, 'size'):
            self.file_size = self.file_path.size
        
        # ファイルタイプを自動判定
        if self.file_name:
            ext = self.file_name.lower().split('.')[-1]
            if ext == 'pdf':
                self.file_type = 'pdf'
            elif ext in ['jpg', 'jpeg', 'png', 'gif', 'webp']:
                self.file_type = 'image'
            elif ext in ['xls', 'xlsx']:
                self.file_type = 'excel'
            elif ext in ['doc', 'docx']:
                self.file_type = 'word'
            else:
                self.file_type = 'other'
        
        super().save(*args, **kwargs)


# ==========================================
# 請求書ワークフローインスタンス
# ==========================================

class InvoiceApprovalWorkflow(models.Model):
    """請求書ワークフローインスタンス - 請求書ごとの承認フロー"""
    WORKFLOW_STATUS_CHOICES = [
        ('in_progress', '承認中'),
        ('completed', '承認完了'),
        ('rejected', '却下'),
    ]
    
    invoice = models.OneToOneField(
        Invoice,
        on_delete=models.CASCADE,
        related_name='workflow',
        verbose_name="請求書"
    )
    current_step = models.IntegerField(default=1, verbose_name="現在のステップ")
    total_steps = models.IntegerField(default=5, verbose_name="総ステップ数")
    workflow_status = models.CharField(
        max_length=20,
        choices=WORKFLOW_STATUS_CHOICES,
        default='in_progress',
        verbose_name="ワークフローステータス"
    )
    started_at = models.DateTimeField(auto_now_add=True, verbose_name="開始日時")
    completed_at = models.DateTimeField(null=True, blank=True, verbose_name="完了日時")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'invoice_approval_workflows'
        verbose_name = "請求書承認ワークフロー"
        verbose_name_plural = "請求書承認ワークフロー一覧"
        indexes = [
            models.Index(fields=['workflow_status']),
        ]
    
    def __str__(self):
        return f"{self.invoice.invoice_number} - Step {self.current_step}/{self.total_steps}"
    
    def advance_step(self):
        """次のステップに進む"""
        if self.current_step < self.total_steps:
            self.current_step += 1
            self.save()
            return True
        return False
    
    def complete(self):
        """ワークフローを完了"""
        self.workflow_status = 'completed'
        self.completed_at = timezone.now()
        self.save()
        
        # 請求書のステータスを更新
        self.invoice.status = 'approved'
        self.invoice.save()
    
    def reject(self):
        """ワークフローを却下"""
        self.workflow_status = 'rejected'
        self.completed_at = timezone.now()
        self.save()
        
        # 請求書のステータスを更新
        self.invoice.status = 'rejected'
        self.invoice.save()


class InvoiceApprovalStep(models.Model):
    """請求書承認ステップインスタンス"""
    STEP_STATUS_CHOICES = [
        ('pending', '待機中'),
        ('in_progress', '進行中'),
        ('approved', '承認済み'),
        ('rejected', '却下'),
        ('returned', '差し戻し'),
    ]
    
    APPROVER_ROLE_CHOICES = [
        ('supervisor', '現場監督'),
        ('manager', '部門長'),
        ('accounting', '経理'),
        ('executive', '役員'),
        ('president', '社長'),
    ]
    
    workflow = models.ForeignKey(
        InvoiceApprovalWorkflow,
        on_delete=models.CASCADE,
        related_name='steps',
        verbose_name="ワークフロー"
    )
    step_number = models.IntegerField(verbose_name="ステップ番号")
    approver_role = models.CharField(
        max_length=20,
        choices=APPROVER_ROLE_CHOICES,
        verbose_name="承認者ロール"
    )
    approver = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approval_steps_assigned',
        verbose_name="承認者"
    )
    step_status = models.CharField(
        max_length=20,
        choices=STEP_STATUS_CHOICES,
        default='pending',
        verbose_name="ステップステータス"
    )
    due_date = models.DateTimeField(null=True, blank=True, verbose_name="期限日時")
    approved_at = models.DateTimeField(null=True, blank=True, verbose_name="承認日時")
    comment = models.TextField(blank=True, verbose_name="コメント")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'invoice_approval_steps'
        verbose_name = "請求書承認ステップ"
        verbose_name_plural = "請求書承認ステップ一覧"
        ordering = ['step_number']
        unique_together = ['workflow', 'step_number']
        indexes = [
            models.Index(fields=['workflow', 'step_number']),
            models.Index(fields=['approver', 'step_status']),
        ]
    
    def __str__(self):
        return f"{self.workflow.invoice.invoice_number} - Step {self.step_number}: {self.get_approver_role_display()}"
    
    def approve(self, user, comment=''):
        """承認"""
        self.step_status = 'approved'
        self.approver = user
        self.approved_at = timezone.now()
        self.comment = comment
        self.save()
        
        # ワークフローを次のステップに進める
        workflow = self.workflow
        if workflow.current_step < workflow.total_steps:
            workflow.advance_step()
            # 次のステップをin_progressに
            next_step = workflow.steps.filter(step_number=workflow.current_step).first()
            if next_step:
                next_step.step_status = 'in_progress'
                next_step.save()
        else:
            workflow.complete()
    
    def reject(self, user, comment=''):
        """却下"""
        self.step_status = 'rejected'
        self.approver = user
        self.approved_at = timezone.now()
        self.comment = comment
        self.save()
        
        self.workflow.reject()
    
    def return_to_previous(self, user, comment=''):
        """差し戻し"""
        self.step_status = 'returned'
        self.approver = user
        self.approved_at = timezone.now()
        self.comment = comment
        self.save()
        
        # 請求書を差し戻し状態に
        self.workflow.invoice.status = 'returned'
        self.workflow.invoice.save()


# ==========================================
# タスク2: 新規ユーザー自己登録機能
# ==========================================

class UserRegistrationRequest(models.Model):
    """ユーザー登録申請"""
    STATUS_CHOICES = [
        ('PENDING', '承認待ち'),
        ('APPROVED', '承認済み'),
        ('REJECTED', '却下'),
    ]
    
    # 基本情報
    company_name = models.CharField(max_length=200, verbose_name="会社名")
    company_name_kana = models.CharField(max_length=200, verbose_name="会社名（ふりがな）", blank=True)
    full_name = models.CharField(max_length=100, verbose_name="氏名")
    email = models.EmailField(unique=True, verbose_name="メールアドレス")
    phone_number = models.CharField(max_length=20, verbose_name="電話番号")
    fax_number = models.CharField(max_length=20, verbose_name="FAX番号", blank=True)
    postal_code = models.CharField(max_length=10, verbose_name="郵便番号")
    address = models.TextField(verbose_name="住所")
    
    # 会社詳細情報
    representative_name = models.CharField(max_length=100, verbose_name="代表者名", blank=True)
    invoice_registration_number = models.CharField(
        max_length=20, verbose_name="インボイス番号", blank=True,
        help_text="T+13桁の番号（例: T1234567890123）"
    )
    head_office_address = models.TextField(verbose_name="本社住所", blank=True)
    
    # 任意項目
    department = models.CharField(max_length=100, blank=True, verbose_name="部署")
    position = models.CharField(max_length=100, blank=True, verbose_name="役職")
    notes = models.TextField(blank=True, verbose_name="備考")
    
    # 承認管理
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING', verbose_name="ステータス")
    submitted_at = models.DateTimeField(auto_now_add=True, verbose_name="申請日時")
    reviewed_at = models.DateTimeField(null=True, blank=True, verbose_name="審査日時")
    reviewed_by = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='reviewed_registrations',
        verbose_name="審査者"
    )
    rejection_reason = models.TextField(blank=True, verbose_name="却下理由")

    # 振込先金融機関情報（登録申請時に収集）
    bank_name = models.CharField(max_length=100, blank=True, verbose_name="銀行名")
    bank_branch = models.CharField(max_length=100, blank=True, verbose_name="支店名")
    bank_account_type = models.CharField(
        max_length=10,
        choices=[('ordinary', '普通'), ('current', '当座')],
        default='ordinary',
        blank=True,
        verbose_name="口座種別"
    )
    bank_account_number = models.CharField(max_length=20, blank=True, verbose_name="口座番号")
    bank_account_holder = models.CharField(max_length=100, blank=True, verbose_name="口座名義")

    # 作成されたユーザーへの参照
    created_user = models.OneToOneField(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='registration_request',
        verbose_name="作成されたユーザー"
    )
    
    class Meta:
        db_table = 'user_registration_requests'
        ordering = ['-submitted_at']
        verbose_name = 'ユーザー登録申請'
        verbose_name_plural = 'ユーザー登録申請'
    
    def __str__(self):
        return f"{self.company_name} - {self.full_name} ({self.get_status_display()})"


# ==========================================
# タスク3: 支払いカレンダー・締め日管理機能
# ==========================================

class PaymentCalendar(models.Model):
    """支払いカレンダー"""
    year = models.IntegerField(verbose_name="年")
    month = models.IntegerField(
        verbose_name="月",
        validators=[MinValueValidator(1), MaxValueValidator(12)]
    )
    payment_date = models.DateField(verbose_name="支払日")
    deadline_date = models.DateField(verbose_name="請求書締め日")
    is_holiday_period = models.BooleanField(
        default=False,
        verbose_name="休暇期間フラグ"
    )
    holiday_note = models.TextField(
        blank=True,
        verbose_name="休暇に関するお知らせ"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'payment_calendars'
        unique_together = ['year', 'month']
        ordering = ['year', 'month']
        verbose_name = '支払いカレンダー'
        verbose_name_plural = '支払いカレンダー'
    
    def __str__(self):
        return f"{self.year}年{self.month}月"
    
    @property
    def is_non_standard_deadline(self):
        """締め日が25日以外かどうか"""
        return self.deadline_date.day != 25


class DeadlineNotificationBanner(models.Model):
    """締め日変更バナー"""
    is_active = models.BooleanField(default=False, verbose_name="表示中")
    target_year = models.IntegerField(verbose_name="対象年")
    target_month = models.IntegerField(
        verbose_name="対象月",
        validators=[MinValueValidator(1), MaxValueValidator(12)]
    )
    
    # メッセージテンプレート
    message_template = models.TextField(
        default="いつもありがとうございます。{period}のため、請求書の締め日を{deadline_date}とさせていただきます。",
        verbose_name="メッセージテンプレート",
        help_text="{period}と{deadline_date}が自動置換されます"
    )
    period_name = models.CharField(
        max_length=100,
        verbose_name="期間名",
        help_text="例: 年末年始、ゴールデンウィーク"
    )
    
    # カスタムメッセージ（テンプレート上書き用）
    custom_message = models.TextField(
        blank=True,
        verbose_name="カスタムメッセージ",
        help_text="指定した場合、テンプレートより優先されます"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_banners',
        verbose_name="作成者"
    )
    
    class Meta:
        db_table = 'deadline_notification_banners'
        ordering = ['-created_at']
        verbose_name = '締め日変更バナー'
        verbose_name_plural = '締め日変更バナー'
    
    def __str__(self):
        return f"{self.target_year}年{self.target_month}月のバナー"
    
    def get_display_message(self):
        """表示メッセージを取得"""
        if self.custom_message:
            return self.custom_message
        
        try:
            calendar = PaymentCalendar.objects.get(
                year=self.target_year,
                month=self.target_month
            )
            return self.message_template.format(
                period=self.period_name,
                deadline_date=calendar.deadline_date.strftime('%Y年%m月%d日')
            )
        except PaymentCalendar.DoesNotExist:
            return self.message_template


# ==========================================
# Phase 6: コア機能強化（ログ・監査）
# ==========================================

class AuditLog(models.Model):
    """操作ログ・監査ログ"""
    ACTION_CHOICES = [
        ('create', '作成'),
        ('update', '更新'),
        ('delete', '削除'),
        ('login', 'ログイン'),
        ('logout', 'ログアウト'),
        ('approve', '承認'),
        ('reject', '否認'),
        ('remand', '差戻し'),
        ('cancel', '取り消し'),
        ('other', 'その他'),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name="操作ユーザー",
        related_name='audit_logs'
    )
    action = models.CharField(max_length=20, choices=ACTION_CHOICES, verbose_name="操作種別")
    target_model = models.CharField(max_length=50, verbose_name="対象モデル名")
    target_id = models.CharField(max_length=50, verbose_name="対象ID", blank=True)
    target_label = models.CharField(max_length=200, verbose_name="対象ラベル", blank=True, help_text="対象オブジェクトの文字列表現")
    details = models.JSONField(verbose_name="詳細情報", default=dict, blank=True)
    ip_address = models.GenericIPAddressField(verbose_name="IPアドレス", null=True, blank=True)
    user_agent = models.TextField(verbose_name="ユーザーエージェント", blank=True)
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="操作日時")

    class Meta:
        db_table = 'audit_logs'
        verbose_name = "操作ログ"
        verbose_name_plural = "操作ログ一覧"
        ordering = ['-created_at']

    def __str__(self):
        user_name = self.user.get_full_name() if self.user else 'System'
        return f"{self.created_at} - {user_name} - {self.get_action_display()} - {self.target_model}"