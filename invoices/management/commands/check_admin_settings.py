from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from invoices.models import Invoice, ApprovalStep

User = get_user_model()

class Command(BaseCommand):
    help = 'Check admin settings for Department Manager'

    def handle(self, *args, **options):
        self.stdout.write("=== 管理設定チェック ===")
        
        # 1. 部長（長嶺）ユーザーを確認
        bucho = User.objects.filter(email='nagamine@hira-ko.jp').first()
        if not bucho:
            self.stdout.write(self.style.ERROR("❌ 部長ユーザー 'nagamine@hira-ko.jp' が見つかりません"))
        else:
            self.stdout.write(f"✅ 部長: {bucho.last_name} {bucho.first_name} (ID:{bucho.id})")
            self.stdout.write(f"   - Active: {bucho.is_active}")
            self.stdout.write(f"   - Position: {bucho.position}")
            
        # 2. 承認ステップ確認
        step = ApprovalStep.objects.filter(approver_position='department_manager').first()
        if not step:
            self.stdout.write(self.style.ERROR("❌ 部長承認ステップが見つかりません"))
        else:
            self.stdout.write(f"✅ 部長承認ステップ: {step.step_name}")
            self.stdout.write(f"   - Approver User: {step.approver_user}")
            if bucho and step.approver_user != bucho:
                self.stdout.write(self.style.WARNING(f"   ⚠️ 承認者が長嶺ではありません！ 現在: {step.approver_user}"))

        # 3. 最新の請求書状態
        invoice = Invoice.objects.order_by('-updated_at').first()
        if invoice:
            self.stdout.write(f"\n=== 最新請求書 (ID:{invoice.id}) ===")
            self.stdout.write(f"   - Status: {invoice.status}")
            self.stdout.write(f"   - Current Step: {invoice.current_approval_step}")
            self.stdout.write(f"   - Current Approver: {invoice.current_approver}")
        else:
            self.stdout.write("⚠️ 請求書がありません")

        self.stdout.write("=== チェック完了 ===")
