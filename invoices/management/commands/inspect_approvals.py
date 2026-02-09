from django.core.management.base import BaseCommand
from invoices.models import Invoice, ConstructionSite, User

class Command(BaseCommand):
    help = 'Inspect pending invoices for approval issues'

    def handle(self, *args, **options):
        self.stdout.write("=== Inspecting Pending Invoices ===")
        pending_invoices = Invoice.objects.filter(status='pending_approval')
        
        self.stdout.write(f"Found {pending_invoices.count()} pending invoices.")
        
        for inv in pending_invoices:
            self.stdout.write(f"\nInvoice: {inv.invoice_number} (ID: {inv.id})")
            
            site_name = inv.construction_site.name if inv.construction_site else 'None'
            self.stdout.write(f"  Site: {site_name}")
            
            supervisor = inv.construction_site.supervisor if inv.construction_site else None
            supervisor_name = supervisor.get_full_name() if supervisor else 'None'
            supervisor_id = supervisor.id if supervisor else 'None'
            self.stdout.write(f"  Site Supervisor: {supervisor_name} (ID: {supervisor_id})")
            
            approver = inv.current_approver
            approver_name = approver.get_full_name() if approver else 'None'
            approver_id = approver.id if approver else 'None'
            self.stdout.write(f"  Current Approver: {approver_name} (ID: {approver_id})")
            
            self.stdout.write(f"  Current Step: {inv.current_approval_step}")
            
            if supervisor and approver != supervisor:
                # Check if it's past the first step
                if inv.current_approval_step and inv.current_approval_step.step_order > 1:
                     self.stdout.write(self.style.SUCCESS("  ✓ OK: Past first step, so approver is correct."))
                else:
                     self.stdout.write(self.style.WARNING("  ⚠️ WARNING: Current approver is NOT the site supervisor (and step is 1 or None)!"))
            
            if not approver:
                 self.stdout.write(self.style.ERROR("  ⚠️ ERROR: No current approver set!"))

        self.stdout.write("\n=== Checking Admin Settings ===")
        sites = ConstructionSite.objects.filter(is_active=True)
        self.stdout.write(f"Total Active Sites: {sites.count()}")
        sites_without_supervisor = sites.filter(supervisor__isnull=True)
        self.stdout.write(f"Sites without supervisor: {sites_without_supervisor.count()}")
        if sites_without_supervisor.exists():
            for s in sites_without_supervisor:
                self.stdout.write(f"  - {s.name}")
