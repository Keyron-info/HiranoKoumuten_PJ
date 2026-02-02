# invoices/management/commands/create_sample_users.py

from django.core.management.base import BaseCommand
from invoices.models import User, Company, CustomerCompany, Department


class Command(BaseCommand):
    help = '全役職のサンプルユーザーを作成します'

    def add_arguments(self, parser):
        parser.add_argument(
            '--password',
            type=str,
            default='Test1234!',
            help='全サンプルユーザーのパスワード（デフォルト: Test1234!）'
        )

    def handle(self, *args, **options):
        password = options['password']
        
        # 会社を取得または作成
        company, created = Company.objects.get_or_create(
            name='平野工務店',
            defaults={
                'email': 'info@hirano-koumuten.co.jp',
                'company_type': 'client',
                'is_active': True,
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f'会社を作成: {company.name}'))
        
        # 協力会社を取得または作成
        partner_company, created = CustomerCompany.objects.get_or_create(
            name='サンプル協力会社株式会社',
            defaults={
                'business_type': 'subcontractor',
                'email': 'info@sample-partner.co.jp',
                'phone': '03-1234-5678',
                'address': '東京都千代田区サンプル町1-1-1',
                'is_active': True,
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f'協力会社を作成: {partner_company.name}'))
        
        # 社内ユーザーのリスト
        internal_users = [
            {
                'username': 'supervisor_yamada',
                'email': 'supervisor@hirano.co.jp',
                'first_name': '太郎',
                'last_name': '山田',
                'position': 'site_supervisor',
            },
            {
                'username': 'jomu_tanaka',
                'email': 'jomu@hirano.co.jp',
                'first_name': '次郎',
                'last_name': '田中',
                'position': 'managing_director',
            },
            {
                'username': 'senmu_sato',
                'email': 'senmu@hirano.co.jp',
                'first_name': '三郎',
                'last_name': '佐藤',
                'position': 'senior_managing_director',
            },
            {
                'username': 'president_hirano',
                'email': 'president@hirano.co.jp',
                'first_name': '四郎',
                'last_name': '平野',
                'position': 'president',
            },
            {
                'username': 'keiri_suzuki',
                'email': 'keiri@hirano.co.jp',
                'first_name': '花子',
                'last_name': '鈴木',
                'position': 'accountant',
            },
            {
                'username': 'director_watanabe',
                'email': 'director@hirano.co.jp',
                'first_name': '五郎',
                'last_name': '渡辺',
                'position': 'director',
            },
            {
                'username': 'buchou_yoshida',
                'email': 'buchou@hirano.co.jp',
                'first_name': '六郎',
                'last_name': '吉田',
                'position': 'manager',
            },
            {
                'username': 'kachou_ito',
                'email': 'kachou@hirano.co.jp',
                'first_name': '七郎',
                'last_name': '伊藤',
                'position': 'supervisor',
            },
            {
                'username': 'staff_kobayashi',
                'email': 'staff@hirano.co.jp',
                'first_name': '八郎',
                'last_name': '小林',
                'position': 'staff',
            },
            {
                'username': 'sysadmin_yamamoto',
                'email': 'sysadmin@hirano.co.jp',
                'first_name': '九郎',
                'last_name': '山本',
                'position': 'admin',
                'is_staff': True,
            },
        ]
        
        # 社内ユーザーを作成
        for user_data in internal_users:
            username = user_data.pop('username')
            email = user_data.pop('email')
            is_staff = user_data.pop('is_staff', False)
            
            if User.objects.filter(username=username).exists():
                self.stdout.write(self.style.WARNING(f'スキップ（既存）: {username}'))
                continue
            
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                user_type='internal',
                company=company,
                is_staff=is_staff,
                is_active=True,
                **user_data
            )
            position_display = user.get_position_display() if user.position else ''
            self.stdout.write(self.style.SUCCESS(
                f'作成: {user.last_name} {user.first_name} ({position_display}) - {email}'
            ))
        
        # 協力会社ユーザーを作成
        partner_users = [
            {
                'username': 'partner_test',
                'email': 'partner@example-partner.co.jp',
                'first_name': '会社太郎',
                'last_name': 'サンプル',
                'is_primary_contact': True,
            },
        ]
        
        for user_data in partner_users:
            username = user_data.pop('username')
            email = user_data.pop('email')
            
            if User.objects.filter(username=username).exists():
                self.stdout.write(self.style.WARNING(f'スキップ（既存）: {username}'))
                continue
            
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                user_type='customer',
                customer_company=partner_company,
                is_active=True,
                **user_data
            )
            self.stdout.write(self.style.SUCCESS(
                f'作成（協力会社）: {user.last_name} {user.first_name} ({partner_company.name}) - {email}'
            ))
        
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('=' * 50))
        self.stdout.write(self.style.SUCCESS('サンプルユーザー作成完了!'))
        self.stdout.write(self.style.SUCCESS(f'共通パスワード: {password}'))
        self.stdout.write(self.style.SUCCESS('=' * 50))
        
        # 作成されたユーザー一覧
        self.stdout.write('')
        self.stdout.write('=== 作成されたユーザー一覧 ===')
        internal_count = User.objects.filter(user_type='internal', company=company).count()
        customer_count = User.objects.filter(user_type='customer').count()
        self.stdout.write(f'社内ユーザー: {internal_count}人')
        self.stdout.write(f'協力会社ユーザー: {customer_count}人')
