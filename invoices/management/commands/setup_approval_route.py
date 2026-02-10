from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from invoices.models import Company, ApprovalRoute, ApprovalStep

User = get_user_model()

class Command(BaseCommand):
    help = '平野工務店の承認ルートを設定'

    def handle(self, *args, **options):
        # 会社を取得
        company = Company.objects.filter(name='平野工務店').first()
        if not company:
            self.stdout.write(self.style.ERROR('❌ 会社が見つかりません。先にcreate_hirano_usersを実行してください。'))
            return

        # 承認者を取得（特定ユーザー指定が必要なステップ用）
        senmu = User.objects.filter(email='sakai@hira-ko.jp').first()  # 専務（堺）
        president = User.objects.filter(email='maki@hira-ko.jp').first()  # 社長（眞木）
        jomu = User.objects.filter(email='honjo@oita-kakiemon.jp').first()  # 常務（本城）
        bucho = User.objects.filter(email='tanaka@hira-ko.jp').first()  # 部長（田中）
        
        if not all([senmu, president, jomu, bucho]):
            missing = []
            if not senmu: missing.append('専務 (sakai@hira-ko.jp)')
            if not president: missing.append('社長 (maki@hira-ko.jp)')
            if not jomu: missing.append('常務 (honjo@oita-kakiemon.jp)')
            if not bucho: missing.append('部長 (tanaka@hira-ko.jp)')
            self.stdout.write(self.style.ERROR(f'❌ 必要なユーザーが見つかりません: {", ".join(missing)}'))
            return

        # 既存の承認ルートを削除（リセット）
        ApprovalRoute.objects.filter(company=company).delete()
        self.stdout.write('🔄 既存の承認ルートを削除しました')

        # 基本承認ルート（標準フロー）を作成
        basic_route = ApprovalRoute.objects.create(
            company=company,
            name='基本承認ルート',
            description='現場監督 → 部長 → 専務 → 社長 → 常務 → 経理',
            is_default=True,
            is_active=True
        )
        
        self.stdout.write(self.style.SUCCESS(f'✅ 承認ルート作成: {basic_route.name}'))

        # 承認ステップを作成（新しい順序）
        steps_data = [
            {
                'order': 1,
                'name': '現場監督承認',
                'position': 'site_supervisor',
                'user': None,  # 現場ごとに異なるため指定なし
                'description': '金額・出来高が適正か、減額がないか確認'
            },
            {
                'order': 2,
                'name': '部長承認',
                'position': 'department_manager',
                'user': bucho,  # 田中さん
                'description': '部門管理者による確認'
            },
            {
                'order': 3,
                'name': '専務承認',
                'position': 'senior_managing_director',
                'user': senmu,  # 堺さん
                'description': '金額の確認'
            },
            {
                'order': 4,
                'name': '社長承認',
                'position': 'president',
                'user': president,  # 眞木さん
                'description': '最終決裁'
            },
            {
                'order': 5,
                'name': '常務承認',
                'position': 'managing_director',
                'user': jomu,  # 本城さん
                'description': '常務による確認'
            },
            {
                'order': 6,
                'name': '経理確認',
                'position': 'accountant',
                'user': None,  # 経理担当者は複数いるため指定なし
                'description': '注文書との照合、最終確認'
            },
        ]

        for step_data in steps_data:
            step = ApprovalStep.objects.create(
                route=basic_route,
                step_order=step_data['order'],
                step_name=step_data['name'],
                approver_position=step_data['position'],
                approver_user=step_data['user'],
                is_required=True,
                timeout_days=7
            )
            
            approver_info = f"{step_data['user'].last_name}さん" if step_data['user'] else f"{step.get_approver_position_display()}"
            self.stdout.write(
                self.style.SUCCESS(
                    f'  ✅ Step {step_data["order"]}: {step_data["name"]} - {approver_info}'
                )
            )

        self.stdout.write('\n' + '='*60)
        self.stdout.write(self.style.SUCCESS('\n✨ 承認ルート設定完了'))
        self.stdout.write('\n【承認フロー】')
        self.stdout.write(f'  1. 現場監督（各現場の担当者）')
        self.stdout.write(f'  2. 部長（部門管理者）')
        self.stdout.write(f'  3. 専務取締役（{senmu.last_name} {senmu.first_name}）')
        self.stdout.write(f'  4. 代表取締役社長（{president.last_name} {president.first_name}）')
        self.stdout.write(f'  5. 常務取締役（{jomu.last_name} {jomu.first_name}）')
        self.stdout.write(f'  6. 経理担当')
        self.stdout.write('\n' + '='*60)
