from django.core.management.base import BaseCommand
from django.contrib.auth.hashers import make_password
from invoices.models import User, Company, ApprovalRoute, ApprovalStep

class Command(BaseCommand):
    help = 'Force reset approval routes and key users'

    def handle(self, *args, **options):
        self.stdout.write("STARTING FORCE RESET ROUTES...")
        
        # 0. 旧ユーザー（田中一朗）を無効化
        tanaka = User.objects.filter(email='tanaka@hira-ko.jp').first()
        if tanaka:
            tanaka.is_active = False
            tanaka.position = ''  # 役職もクリアして検索にヒットしないようにする
            tanaka.save()
            self.stdout.write(f"  🗑️ 田中一朗 (ID:{tanaka.id}) を無効化しました")
        
        # 1. Company Setup (Ensure)
        company, _ = Company.objects.get_or_create(name='平野工務店', defaults={
            'email': 'info@hira-ko.jp', 'phone': '03-0000-0000', 'address': 'Tokyo'
        })
        self.stdout.write(f"Company: {company.name} (ID: {company.id})")
        
        default_password = make_password('test1234')
        
        # 2. Force Create/Update Users (正しい役職マッピング)
        users_to_fix = [
            {'email': 'nagamine@hira-ko.jp', 'role': 'department_manager', 'last': '長嶺', 'first': '貴典'},
            {'email': 'maki@hira-ko.jp', 'role': 'senior_managing_director', 'last': '眞木', 'first': '正之'},
            {'email': 'sakai@hira-ko.jp', 'role': 'president', 'last': '堺', 'first': '仁一郎'},
            {'email': 'honjo@oita-kakiemon.jp', 'role': 'managing_director', 'last': '本城', 'first': '美代子'},
            {'email': 'takeda@hira-ko.jp', 'role': 'accountant', 'last': '竹田', 'first': '貴也'},
        ]

        created_users = {}

        for u in users_to_fix:
            email = u['email']
            user, created = User.objects.update_or_create(
                email=email,
                defaults={
                    'username': email,
                    'first_name': u['first'],
                    'last_name': u['last'],
                    'position': u['role'],
                    'user_type': 'internal',
                    'company': company,
                    'is_active': True
                }
            )
            if created:
                user.password = default_password
                user.save()
            created_users[u['role']] = user
            self.stdout.write(f"User {u['last']} ({u['role']}) - ID: {user.id}, Company: {user.company.id}")

        # 3. Approval Route Setup
        # Cleanup ALL routes for this company
        deleted_count, _ = ApprovalRoute.objects.filter(company=company).delete()
        self.stdout.write(f"Deleted {deleted_count} old routes.")

        route = ApprovalRoute.objects.create(
            company=company, 
            name='標準承認ルート', 
            is_default=True, 
            is_active=True
        )
        self.stdout.write(f"Created Route: {route.name} (ID: {route.id})")
        
        # Define Steps (承認順序: 現場監督 -> 部長 -> 専務 -> 社長 -> 常務 -> 経理)
        steps = [
            {'order': 1, 'name': '現場監督承認', 'pos': 'site_supervisor', 'user': None},
            {'order': 2, 'name': '部長承認', 'pos': 'department_manager', 'user': created_users.get('department_manager')},
            {'order': 3, 'name': '専務承認', 'pos': 'senior_managing_director', 'user': created_users.get('senior_managing_director')},
            {'order': 4, 'name': '社長承認', 'pos': 'president', 'user': created_users.get('president')},
            {'order': 5, 'name': '常務承認', 'pos': 'managing_director', 'user': created_users.get('managing_director')},
            {'order': 6, 'name': '経理確認', 'pos': 'accountant', 'user': None},
        ]

        for s in steps:
            ApprovalStep.objects.create(
                route=route,
                step_order=s['order'],
                step_name=s['name'],
                approver_position=s['pos'],
                approver_user=s['user'],
                is_required=True
            )
            u_str = f"User: {s['user'].last_name}" if s['user'] else "User: None"
            self.stdout.write(f"  Step {s['order']}: {s['name']} -> {u_str}")
            
        self.stdout.write("FORCE RESET COMPLETE.")
