from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from invoices.models import Company, CustomerCompany, ConstructionSite
import datetime

User = get_user_model()

class Command(BaseCommand):
    help = '承認フローテスト用の協力会社ユーザーと現場を作成'

    def handle(self, *args, **options):
        # 平野工務店を取得
        company = Company.objects.filter(name='平野工務店').first()
        if not company:
            self.stdout.write(self.style.ERROR('❌ 平野工務店が見つかりません'))
            return

        # テスト用協力会社を作成
        partner_company, created = CustomerCompany.objects.get_or_create(
            name='テスト協力会社',
            defaults={
                'tax_number': '1234567890123',
                'postal_code': '100-0001', 
                'address': '東京都千代田区',
                'email': 'test-partner@example.com',
                'business_type': 'subcontractor',
                'is_active': True
            }
        )
        
        if created:
            self.stdout.write(self.style.SUCCESS(f'✅ 協力会社作成: {partner_company.name}'))
        else:
            self.stdout.write(f'📋 協力会社: {partner_company.name} (既存)')

        # 協力会社ユーザーを作成
        partner_user = User.objects.filter(email='partner@test.com').first()
        if not partner_user:
            partner_user = User.objects.create_user(
                username='partner@test.com',  # emailをusernameにする
                email='partner@test.com',
                password='test1234',
                last_name='テスト',
                first_name='太郎',
                user_type='customer',
                customer_company=partner_company,
                is_active=True
            )
            self.stdout.write(self.style.SUCCESS(f'✅ 協力会社ユーザー作成: {partner_user.email}'))
        else:
            self.stdout.write(f'📋 協力会社ユーザー: {partner_user.email} (既存)')

        # 現場監督を取得（赤嶺さん）
        supervisor = User.objects.filter(email='akamine@hira-ko.jp').first()
        if not supervisor:
            self.stdout.write(self.style.ERROR('❌ 現場監督が見つかりません'))
            return

        # テスト用工事現場を作成
        site, created = ConstructionSite.objects.get_or_create(
            name='承認フローテスト現場',
            defaults={
                'company': company,
                'client_name': 'テスト発注者',
                'prime_contractor': 'テスト元請',
                'supervisor': supervisor,
                'total_budget': 10000000,
                'is_active': True,
                'special_access_password': 'test123',
                'special_access_expiry': datetime.date.today() + datetime.timedelta(days=30)
            }
        )
        site.supervisor = supervisor
        site.save()

        if created:
            self.stdout.write(self.style.SUCCESS(f'✅ 工事現場作成: {site.name}'))
        else:
            self.stdout.write(f'📋 工事現場: {site.name} (既存)')

        self.stdout.write('\n' + '='*60)
        self.stdout.write(self.style.SUCCESS('\n✨ テストデータ作成完了'))
        self.stdout.write('\n【テストアカウント】')
        self.stdout.write(f'  協力会社: {partner_user.email}')
        self.stdout.write(f'  パスワード: test1234')
        self.stdout.write(f'  工事現場: {site.name}')
        self.stdout.write(f'  現場監督: {supervisor.last_name} {supervisor.first_name}')
        self.stdout.write('\n' + '='*60)
