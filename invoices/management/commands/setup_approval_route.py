from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from invoices.models import Company, ApprovalRoute, ApprovalStep

User = get_user_model()

class Command(BaseCommand):
    help = 'Setup new 6-step approval route (現場監督 -> 部長 -> 専務 -> 社長 -> 常務 -> 経理)'

    def handle(self, *args, **options):
        company = Company.objects.first()
        if not company:
            self.stdout.write("No company found.")
            return
        
        self.stdout.write(f"Company found: {company.name}")

        # 1. Reset Routes
        ApprovalRoute.objects.filter(company=company).delete()
        
        route = ApprovalRoute.objects.create(
            company=company, 
            name='標準承認ルート', 
            is_default=True, 
            is_active=True
        )

        # 2. Get Users (正しい役職マッピング)
        # 長嶺 貴典 = 部長 (department_manager)
        # 眞木 正之 = 専務取締役 (senior_managing_director)
        # 堺 仁一郎 = 代表取締役社長 (president)
        # 本城 美代子 = 常務取締役 (managing_director)

        bucho = User.objects.filter(email='nagamine@hira-ko.jp').first()       # 長嶺 = 部長
        senmu = User.objects.filter(email='maki@hira-ko.jp').first()           # 眞木 = 専務
        shacho = User.objects.filter(email='sakai@hira-ko.jp').first()         # 堺 = 社長
        jomu = User.objects.filter(email='honjo@oita-kakiemon.jp').first()     # 本城 = 常務

        # 3. Define Steps
        # 承認順序: 現場監督 -> 部長 -> 専務 -> 社長 -> 常務 -> 経理
        steps_config = []
        
        # Step 1: 現場監督
        steps_config.append({
            'name': '現場監督承認', 'position': 'site_supervisor', 'user': None 
        })
        
        # Step 2: 部長 (長嶺)
        if bucho:
            steps_config.append({
                'name': '部長承認', 'position': 'department_manager', 'user': bucho
            })
        else:
             self.stdout.write(self.style.WARNING("⚠️ 部長ユーザーが見つかりません。部長ステップをスキップします。"))

        # Step 3: 専務 (眞木)
        if senmu:
            steps_config.append({
                'name': '専務承認', 'position': 'senior_managing_director', 'user': senmu
            })

        # Step 4: 社長 (堺)
        if shacho:
            steps_config.append({
                'name': '社長承認', 'position': 'president', 'user': shacho
            })
        
        # Step 5: 常務 (本城)
        if jomu:
            steps_config.append({
                'name': '常務承認', 'position': 'managing_director', 'user': jomu
            })

        # Step 6: 経理
        steps_config.append({
            'name': '経理確認', 'position': 'accountant', 'user': None
        })

        # 4. Create Steps
        for i, step_data in enumerate(steps_config, 1):
            ApprovalStep.objects.create(
                route=route,
                step_order=i,
                step_name=step_data['name'],
                approver_position=step_data['position'],
                approver_user=step_data['user'],
                is_required=True
            )
            user_name = step_data['user'].get_full_name() if step_data['user'] else "(役職指定: 誰でも可)"
            self.stdout.write(f"Step {i}: {step_data['name']} ({user_name})")

        self.stdout.write(self.style.SUCCESS("承認ルートのセットアップが完了しました！"))
