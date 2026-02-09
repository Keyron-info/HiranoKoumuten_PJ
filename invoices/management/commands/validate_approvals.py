from django.core.management.base import BaseCommand
from invoices.models import Company, ApprovalRoute, ApprovalStep, User, ConstructionSite

class Command(BaseCommand):
    help = 'Validate approval configuration and routes'

    def handle(self, *args, **options):
        self.stdout.write("=== Approval Configuration Validation ===")
        
        # 1. Check Companies and Routes
        companies = Company.objects.filter(is_active=True)
        for company in companies:
            self.stdout.write(f"\nScanning Company: {company.name}")
            
            # Check Default Route
            route = ApprovalRoute.objects.filter(company=company, is_default=True, is_active=True).first()
            if not route:
                self.stdout.write(self.style.ERROR(f"  ❌ No default approval route found!"))
                continue
            
            self.stdout.write(f"  ✓ Default Route: {route.name}")
            
            # Check Steps
            steps = route.steps.all().order_by('step_order')
            if not steps.exists():
                self.stdout.write(self.style.ERROR(f"  ❌ No approval steps defined in route!"))
                continue
            
            for step in steps:
                status = "✓"
                approver_info = "Unknown"
                
                if step.approver_user:
                    approver_info = f"User: {step.approver_user.get_full_name()}"
                else:
                    # Check if users exist for this position
                    users = User.objects.filter(
                        company=company, 
                        user_type='internal',
                        position=step.approver_position,
                        is_active=True
                    )
                    count = users.count()
                    if count == 0:
                        status = "❌"
                        approver_info = f"Position: {step.get_approver_position_display()} (0 users found!)"
                    else:
                        approver_info = f"Position: {step.get_approver_position_display()} ({count} users found)"
                
                color_style = self.style.SUCCESS if status == "✓" else self.style.ERROR
                self.stdout.write(color_style(f"    Step {step.step_order}: {step.step_name} -> {approver_info}"))

        # 2. Check Construction Sites (Supervisors)
        self.stdout.write("\n=== Checking Construction Sites ===")
        sites = ConstructionSite.objects.filter(is_active=True)
        sites_without_supervisor = []
        for site in sites:
            if not site.supervisor:
                sites_without_supervisor.append(site.name)
        
        if sites_without_supervisor:
            self.stdout.write(self.style.ERROR(f"❌ Found {len(sites_without_supervisor)} sites without a supervisor!"))
            for name in sites_without_supervisor:
                self.stdout.write(f"  - {name}")
        else:
             self.stdout.write(self.style.SUCCESS("✓ All active sites have a supervisor assigned."))

        self.stdout.write("\n=== Validation Complete ===")
