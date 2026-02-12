from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from invoices.models import ApprovalRoute

User = get_user_model()

class Command(BaseCommand):
    help = 'Generate a summary table of all users and approval routes'

    def handle(self, *args, **options):
        self.stdout.write("\n=== ✨ 生成されたユーザー一覧 (Generated Users) ===")
        # Header
        header = f"{'名前 (Name)':<15} | {'メールアドレス (Email)':<30} | {'役職 (Role)':<25} | {'権限 (Permissions)'}"
        self.stdout.write(header)
        self.stdout.write("-" * 100)
        
        users = User.objects.filter(is_active=True).order_by('id')
        for u in users:
            role_disp = u.get_position_display() if u.user_type == 'internal' else '協力会社'
            perms = []
            if u.is_superuser: perms.append('Superuser')
            if u.is_staff: perms.append('Staff')
            if u.has_perm('invoices.can_save_data'): perms.append('CanSave') # Check specific perm if attributes fail
            
            perm_str = ", ".join(perms) if perms else "-"
            
            self.stdout.write(f"{u.last_name} {u.first_name:<10} | {u.email:<30} | {role_disp:<25} | {perm_str}")

        self.stdout.write("\n\n=== 🔄 承認ルート設定 (Approval Route) ===")
        routes = ApprovalRoute.objects.filter(is_active=True)
        for r in routes:
            self.stdout.write(f"Route: {r.name} (Default: {r.is_default})")
            steps = r.steps.all().order_by('step_order')
            for s in steps:
                approver = s.approver_user.get_full_name() if s.approver_user else "(役職指定: 誰でも可)"
                self.stdout.write(f"  Step {s.step_order}: {s.step_name:<15} -> {approver} ({s.get_approver_position_display()})")
