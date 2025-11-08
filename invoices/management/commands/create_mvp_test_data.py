# backend/invoices/management/commands/create_mvp_test_data.py

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from invoices.models import (
    Company, Department, CustomerCompany, ConstructionSite,
    ApprovalRoute, ApprovalStep, User
)

User = get_user_model()


class Command(BaseCommand):
    help = 'MVP用の完全なテストデータを作成（5段階承認フロー対応）'

    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.SUCCESS('=== MVP テストデータ作成開始 ===\n'))

        # ============================================
        # 1. 会社作成
        # ============================================
        self.stdout.write('1. 会社を作成中...')
        company, created = Company.objects.get_or_create(
            name='平野工務店',
            defaults={
                'postal_code': '100-0001',
                'address': '東京都千代田区千代田1-1',
                'phone': '03-1234-5678',
                'email': 'info@hirano-koumuten.co.jp',
                'tax_number': '1234567890123',
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f'  ✅ {company.name} を作成'))
        else:
            self.stdout.write(f'  ℹ️  {company.name} は既に存在')

        # ============================================
        # 2. 部署作成
        # ============================================
        self.stdout.write('\n2. 部署を作成中...')
        dept_soumu, _ = Department.objects.get_or_create(
            company=company,
            code='SOUMU',
            defaults={
                'name': '総務部',
                'manager_name': '総務部長',
            }
        )
        self.stdout.write(self.style.SUCCESS(f'  ✅ {dept_soumu.name} を作成'))

        # ============================================
        # 3. 社内ユーザー作成（5段階承認フロー）
        # ============================================
        self.stdout.write('\n3. 社内ユーザーを作成中...')

        internal_users = [
            {
                'username': 'genba_test',
                'password': 'test1234',
                'email': 'genba@hirano.co.jp',
                'first_name': '太郎',
                'last_name': '現場',
                'position': 'site_supervisor',
                'department': None,
            },
            {
                'username': 'joumu_test',
                'password': 'test1234',
                'email': 'joumu@hirano.co.jp',
                'first_name': '一郎',
                'last_name': '常務',
                'position': 'managing_director',
                'department': None,
            },
            {
                'username': 'senmu_test',
                'password': 'test1234',
                'email': 'senmu@hirano.co.jp',
                'first_name': '次郎',
                'last_name': '専務',
                'position': 'senior_managing_director',
                'department': None,
            },
            {
                'username': 'president_test',
                'password': 'test1234',
                'email': 'president@hirano.co.jp',
                'first_name': '三郎',
                'last_name': '社長',
                'position': 'president',
                'department': None,
            },
            {
                'username': 'keiri_test',
                'password': 'test1234',
                'email': 'keiri@hirano.co.jp',
                'first_name': '花子',
                'last_name': '経理',
                'position': 'accountant',
                'department': dept_soumu,
            },
        ]

        created_users = {}
        for user_data in internal_users:
            user, created = User.objects.get_or_create(
                username=user_data['username'],
                defaults={
                    'email': user_data['email'],
                    'first_name': user_data['first_name'],
                    'last_name': user_data['last_name'],
                    'user_type': 'internal',
                    'company': company,
                    'department': user_data['department'],
                    'position': user_data['position'],
                    'is_active': True,
                }
            )
            if created:
                user.set_password(user_data['password'])
                user.save()
                self.stdout.write(self.style.SUCCESS(
                    f'  ✅ {user.last_name}{user.first_name} ({user.get_position_display()}) を作成'
                ))
            else:
                self.stdout.write(f'  ℹ️  {user.username} は既に存在')
            
            created_users[user_data['username']] = user

        # ============================================
        # 4. 協力会社作成
        # ============================================
        self.stdout.write('\n4. 協力会社を作成中...')
        customer_company, created = CustomerCompany.objects.get_or_create(
            name='テスト協力会社',
            defaults={
                'business_type': 'subcontractor',
                'postal_code': '150-0001',
                'address': '東京都渋谷区渋谷1-1-1',
                'phone': '03-9876-5432',
                'email': 'info@test-kyouryoku.co.jp',
                'tax_number': '9876543210987',
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f'  ✅ {customer_company.name} を作成'))
        else:
            self.stdout.write(f'  ℹ️  {customer_company.name} は既に存在')

        # ============================================
        # 5. 協力会社ユーザー作成
        # ============================================
        self.stdout.write('\n5. 協力会社ユーザーを作成中...')
        kyouryoku_user, created = User.objects.get_or_create(
            username='kyouryoku_test',
            defaults={
                'email': 'tantou@test-kyouryoku.co.jp',
                'first_name': '一郎',
                'last_name': '協力',
                'user_type': 'customer',
                'customer_company': customer_company,
                'is_primary_contact': True,
                'is_active': True,
            }
        )
        if created:
            kyouryoku_user.set_password('test1234')
            kyouryoku_user.save()
            self.stdout.write(self.style.SUCCESS(
                f'  ✅ {kyouryoku_user.last_name}{kyouryoku_user.first_name} (協力会社ユーザー) を作成'
            ))
        else:
            self.stdout.write(f'  ℹ️  kyouryoku_test は既に存在')

        # ============================================
        # 6. 工事現場作成（現場監督を設定）
        # ============================================
        self.stdout.write('\n6. 工事現場を作成中...')
        
        sites_data = [
            {
                'name': '新宿ビル建設現場',
                'location': '東京都新宿区西新宿2-8-1',
                'supervisor': created_users['genba_test'],
            },
            {
                'name': '渋谷マンション改修現場',
                'location': '東京都渋谷区道玄坂1-2-3',
                'supervisor': created_users['genba_test'],
            },
            {
                'name': '品川オフィス新築現場',
                'location': '東京都品川区東品川4-12-4',
                'supervisor': created_users['genba_test'],
            },
        ]

        for site_data in sites_data:
            site, created = ConstructionSite.objects.get_or_create(
                name=site_data['name'],
                company=company,
                defaults={
                    'location': site_data['location'],
                    'supervisor': site_data['supervisor'],
                    'is_active': True,
                }
            )
            if created:
                supervisor_name = site_data['supervisor'].get_full_name()
                self.stdout.write(self.style.SUCCESS(
                    f'  ✅ {site.name} を作成（監督: {supervisor_name}）'
                ))
            else:
                # 既存の現場にも監督を設定
                if not site.supervisor:
                    site.supervisor = site_data['supervisor']
                    site.save()
                    self.stdout.write(self.style.WARNING(
                        f'  🔧 {site.name} に監督を設定: {site_data["supervisor"].get_full_name()}'
                    ))
                else:
                    self.stdout.write(f'  ℹ️  {site.name} は既に存在')

        # ============================================
        # 7. 承認ルート作成（5段階）
        # ============================================
        self.stdout.write('\n7. 承認ルートを作成中...')
        
        approval_route, created = ApprovalRoute.objects.get_or_create(
            company=company,
            name='標準承認ルート（5段階）',
            defaults={
                'description': '現場監督 → 常務 → 専務 → 社長 → 経理',
                'is_default': True,
                'is_active': True,
            }
        )
        
        if created:
            self.stdout.write(self.style.SUCCESS(f'  ✅ {approval_route.name} を作成'))
        else:
            self.stdout.write(f'  ℹ️  {approval_route.name} は既に存在')

        # ============================================
        # 8. 承認ステップ作成
        # ============================================
        self.stdout.write('\n8. 承認ステップを作成中...')

        steps_data = [
            {
                'step_order': 1,
                'step_name': '現場監督承認',
                'approver_position': 'site_supervisor',
                'approver_user': None,  # 工事現場から自動割り当て
                'timeout_days': 3,
            },
            {
                'step_order': 2,
                'step_name': '常務承認',
                'approver_position': 'managing_director',
                'approver_user': created_users['joumu_test'],
                'timeout_days': 3,
            },
            {
                'step_order': 3,
                'step_name': '専務承認',
                'approver_position': 'senior_managing_director',
                'approver_user': created_users['senmu_test'],
                'timeout_days': 3,
            },
            {
                'step_order': 4,
                'step_name': '社長承認',
                'approver_position': 'president',
                'approver_user': created_users['president_test'],
                'timeout_days': 5,
            },
            {
                'step_order': 5,
                'step_name': '経理最終確認',
                'approver_position': 'accountant',
                'approver_user': created_users['keiri_test'],
                'timeout_days': 2,
            },
        ]

        for step_data in steps_data:
            step, created = ApprovalStep.objects.get_or_create(
                route=approval_route,
                step_order=step_data['step_order'],
                defaults={
                    'step_name': step_data['step_name'],
                    'approver_position': step_data['approver_position'],
                    'approver_user': step_data['approver_user'],
                    'is_required': True,
                    'timeout_days': step_data['timeout_days'],
                }
            )
            if created:
                approver_info = step_data['approver_user'].get_full_name() if step_data['approver_user'] else '(工事現場から自動)'
                self.stdout.write(self.style.SUCCESS(
                    f'  ✅ Step {step_data["step_order"]}: {step_data["step_name"]} - {approver_info}'
                ))
            else:
                self.stdout.write(f'  ℹ️  Step {step_data["step_order"]} は既に存在')

        # ============================================
        # 完了メッセージ
        # ============================================
        self.stdout.write(self.style.SUCCESS('\n' + '='*60))
        self.stdout.write(self.style.SUCCESS('✅ MVP テストデータ作成完了！\n'))
        
        self.stdout.write(self.style.WARNING('📝 作成されたテストユーザー:\n'))
        self.stdout.write('  協力会社ユーザー:')
        self.stdout.write('    - kyouryoku_test / test1234')
        self.stdout.write('\n  社内ユーザー（承認フロー）:')
        self.stdout.write('    - genba_test / test1234 (現場監督)')
        self.stdout.write('    - joumu_test / test1234 (常務取締役)')
        self.stdout.write('    - senmu_test / test1234 (専務取締役)')
        self.stdout.write('    - president_test / test1234 (代表取締役社長)')
        self.stdout.write('    - keiri_test / test1234 (経理担当)')
        
        self.stdout.write(self.style.WARNING('\n🏗️  工事現場: 3件作成（全て現場監督割り当て済み）'))
        self.stdout.write(self.style.WARNING('🔄 承認ルート: 5段階承認フロー設定済み'))
        self.stdout.write(self.style.SUCCESS('\n' + '='*60))
