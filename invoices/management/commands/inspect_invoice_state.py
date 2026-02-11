from django.core.management.base import BaseCommand
from invoices.models import Invoice, ApprovalStep, User, ApprovalRoute

class Command(BaseCommand):
    help = 'Inspect the latest invoice and department manager user'

    def handle(self, *args, **options):
        # 1. 最後に更新された請求書を取得
        invoice = Invoice.objects.order_by('-updated_at').first()
        if not invoice:
            self.stdout.write("No invoices found.")
            return

        self.stdout.write(f"=== Latest Invoice: {invoice.invoice_number} ===")
        self.stdout.write(f"ID: {invoice.id}")
        self.stdout.write(f"Status: {invoice.status}")
        self.stdout.write(f"Current Approver ID: {invoice.current_approver_id}")
        if invoice.current_approver:
            self.stdout.write(f"Current Approver: {invoice.current_approver.last_name} {invoice.current_approver.first_name} ({invoice.current_approver.email})")
        else:
            self.stdout.write("Current Approver: None")

        if invoice.current_approval_step:
            step = invoice.current_approval_step
            self.stdout.write(f"Current Step: {step.step_name} (Order: {step.step_order})")
            self.stdout.write(f"  Route: {step.route.name} (ID: {step.route.id})")
            self.stdout.write(f"  Step Approver User: {step.approver_user}")
            self.stdout.write(f"  Step Approver Position: {step.approver_position}")
        else:
            self.stdout.write("Current Step: None")

        # 2. 部長（田中）ユーザーを確認
        tanaka = User.objects.filter(email='tanaka@hira-ko.jp').first()
        self.stdout.write(f"\n=== Department Manager User (Tanaka) ===")
        if tanaka:
            self.stdout.write(f"ID: {tanaka.id}")
            self.stdout.write(f"Name: {tanaka.last_name} {tanaka.first_name}")
            self.stdout.write(f"Email: {tanaka.email}")
            self.stdout.write(f"Position: {tanaka.position}")
            self.stdout.write(f"Is Active: {tanaka.is_active}")
        else:
            self.stdout.write("User 'tanaka@hira-ko.jp' not found.")

        # 3. 承認ルートの確認
        self.stdout.write(f"\n=== Active Approval Routes ===")
        routes = ApprovalRoute.objects.filter(is_active=True)
        for route in routes:
            self.stdout.write(f"Route: {route.name} (ID: {route.id})")
            for step in route.steps.all().order_by('step_order'):
                user_str = f"{step.approver_user.last_name}" if step.approver_user else "None"
                self.stdout.write(f"  Step {step.step_order}: {step.step_name} (Pos: {step.approver_position}, User: {user_str})")

