from django.core.management.base import BaseCommand
from invoices.models import Invoice, User, ApprovalStep

class Command(BaseCommand):
    help = 'Debug invoice approval state'

    def add_arguments(self, parser):
        parser.add_argument('--id', type=int, help='Invoice ID to debug')

    def handle(self, *args, **options):
        self.stdout.write("=== DEBUG START ===")
        
        invoice_id = options.get('id')
        if invoice_id:
            invoice = Invoice.objects.filter(id=invoice_id).first()
        else:
            # 1. Latest invoice if no ID is provided
            invoice = Invoice.objects.order_by('-created_at').first()
        
        if not invoice:
            if invoice_id:
                self.stdout.write(f"No invoice found with ID: {invoice_id}")
            else:
                self.stdout.write("No invoice found in the database.")
            return

        self.stdout.write(f"Invoice: {invoice.invoice_number}")
        self.stdout.write(f"Status: {invoice.status}")
        
        # 2. Current Approver
        approver = invoice.current_approver
        self.stdout.write(f"Current Approver in DB: {approver}")
        if approver:
            self.stdout.write(f"  ID: {approver.id} (Type: {type(approver.id)})")
            self.stdout.write(f"  Email: {approver.email}")
            self.stdout.write(f"  Position: {approver.position}")
        else:
            self.stdout.write("  Current Approver is None")
        
        # 3. Current Step
        step = invoice.current_approval_step
        self.stdout.write(f"Current Step: {step}")
        if step:
            self.stdout.write(f"  Name: {step.step_name}")
            self.stdout.write(f"  Approver User (on Step definition): {step.approver_user}")
            if step.approver_user:
                 self.stdout.write(f"    ID: {step.approver_user.id}")
        else:
            self.stdout.write("  Current Step is None")

        # 4. Tanaka User
        try:
            tanaka = User.objects.get(email='tanaka@hira-ko.jp')
            self.stdout.write(f"=== Tanaka User (Expected) ===")
            self.stdout.write(f"ID: {tanaka.id} (Type: {type(tanaka.id)})")
            self.stdout.write(f"Email: {tanaka.email}")
            self.stdout.write(f"Position: {tanaka.position}")
            
            if approver:
                match = (approver.id == tanaka.id)
                self.stdout.write(f"MATCH CHECK: {match}")
            
        except User.DoesNotExist:
            self.stdout.write("Tanaka user not found in DB")

        self.stdout.write("=== DEBUG END ===")
