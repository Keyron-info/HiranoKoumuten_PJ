from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from invoices.models import Invoice, ApprovalStep

User = get_user_model()

class Command(BaseCommand):
    help = 'Check admin settings for Department Manager'

    def handle(self, *args, **options):
        self.stdout.write("=== CHECKING ADMIN SETTINGS ===")
        
        # 1. Check User 'tanaka'
        tanaka = User.objects.filter(email='tanaka@hira-ko.jp').first()
        if not tanaka:
            self.stdout.write(self.style.ERROR("❌ User 'tanaka@hira-ko.jp' NOT FOUND"))
        else:
            self.stdout.write(f"✅ User 'tanaka@hira-ko.jp' found. ID: {tanaka.id}")
            self.stdout.write(f"   - Active: {tanaka.is_active}")
            self.stdout.write(f"   - Staff: {tanaka.is_staff}")
            self.stdout.write(f"   - Position: {tanaka.position}")
            
        # 2. Check Approval Step
        step = ApprovalStep.objects.filter(approver_position='department_manager').first()
        if not step:
             self.stdout.write(self.style.ERROR("❌ Approval Step for 'department_manager' NOT FOUND"))
        else:
            self.stdout.write(f"✅ Approval Step 'department_manager' found.")
            self.stdout.write(f"   - Step Name: {step.step_name}")
            self.stdout.write(f"   - Approver User: {step.approver_user}")
            if step.approver_user != tanaka:
                 self.stdout.write(self.style.WARNING(f"   ⚠️ Approver User mismatch! Expected {tanaka}, got {step.approver_user}"))

        # 3. Check Latest Invoice (ID 19 based on screenshot)
        invoice = Invoice.objects.filter(id=19).first()
        if not invoice:
             # Try getting the last one if 19 doesn't exist (in case of ID mismatch)
             invoice = Invoice.objects.last()
        
        if invoice:
            self.stdout.write(f"=== INVOICE {invoice.id} ({invoice.invoice_number}) STATE ===")
            self.stdout.write(f"   - Status: {invoice.status}")
            self.stdout.write(f"   - Current Step: {invoice.current_approval_step}")
            self.stdout.write(f"   - Current Approver: {invoice.current_approver}")
            
            if invoice.current_approver != tanaka:
                 self.stdout.write(self.style.ERROR(f"   ❌ Current Approver is NOT Tanaka! It is: {invoice.current_approver}"))
            else:
                 self.stdout.write(self.style.SUCCESS(f"   ✅ Current Approver IS Tanaka."))
        else:
             self.stdout.write("⚠️ No invoice found to check.")

        self.stdout.write("=== END CHECK ===")
