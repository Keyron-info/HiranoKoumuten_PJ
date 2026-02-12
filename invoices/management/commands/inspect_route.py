from django.core.management.base import BaseCommand
from invoices.models import Invoice, ApprovalRoute
from django.contrib.auth import get_user_model

User = get_user_model()

class Command(BaseCommand):
    help = 'Inspect approval route and user details'

    def handle(self, *args, **options):
        try:
            # 1. Check Invoice 34
            try:
                invoice = Invoice.objects.get(id=34)
                self.stdout.write(f"Invoice ID: {invoice.id}, Status: {invoice.status}")
                if invoice.current_approver:
                    self.stdout.write(f"Current Approver: {invoice.current_approver.get_full_name()} (ID: {invoice.current_approver.id})")
                else:
                    self.stdout.write("Current Approver: None")
                
                # 2. Check Route
                if invoice.approval_route:
                    route = invoice.approval_route
                    self.stdout.write(f"\nRoute: {route.name} (ID: {route.id})")
                    steps = route.steps.all().order_by('step_order')
                    for step in steps:
                        user_name = step.approver_user.get_full_name() if step.approver_user else "None"
                        self.stdout.write(f"  Step {step.step_order}: {step.step_name} (Position: {step.get_approver_position_display()}, User: {user_name})")
                else:
                    self.stdout.write("\nNo Approval Route Assigned")

                # 4. Check who approved so far (History)
                self.stdout.write("\nApproval History:")
                for history in invoice.approval_histories.all().order_by('timestamp'):
                    user_name = history.user.get_full_name() if history.user else "Unknown"
                    self.stdout.write(f"  - {history.action} by {user_name} at {history.timestamp}")

            except Invoice.DoesNotExist:
                self.stdout.write("Invoice 34 not found")

            # 3. Check User ID 4
            try:
                user4 = User.objects.get(id=4)
                self.stdout.write(f"\nUser ID 4: {user4.username}, Name: {user4.get_full_name()}, Email: {user4.email}, Position: {user4.position}")
            except User.DoesNotExist:
                self.stdout.write("\nUser ID 4 not found")

        except Exception as e:
            self.stdout.write(f"Error: {e}")
