
import os
import django
from django.conf import settings

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from invoices.models import Invoice, ConstructionSite, User, ApprovalRoute

def inspect_invoices():
    print("=== Inspecting Pending Invoices ===")
    pending_invoices = Invoice.objects.filter(status='pending_approval')
    
    print(f"Found {pending_invoices.count()} pending invoices.")
    
    for inv in pending_invoices:
        print(f"\nInvoice: {inv.invoice_number} (ID: {inv.id})")
        print(f"  Site: {inv.construction_site.name if inv.construction_site else 'None'}")
        
        supervisor = inv.construction_site.supervisor if inv.construction_site else None
        print(f"  Site Supervisor: {supervisor.get_full_name() if supervisor else 'None'} (ID: {supervisor.id if supervisor else 'None'})")
        
        print(f"  Current Approver: {inv.current_approver.get_full_name() if inv.current_approver else 'None'} (ID: {inv.current_approver.id if inv.current_approver else 'None'})")
        print(f"  Current Step: {inv.current_approval_step}")
        
        if supervisor and inv.current_approver != supervisor:
            print("  ⚠️ WARNING: Current approver is NOT the site supervisor!")
            
        if not inv.current_approver:
             print("  ⚠️ ERROR: No current approver set!")

    print("\n=== Checking Admin Settings ===")
    sites = ConstructionSite.objects.filter(is_active=True)
    print(f"Total Active Sites: {sites.count()}")
    sites_without_supervisor = sites.filter(supervisor__isnull=True)
    print(f"Sites without supervisor: {sites_without_supervisor.count()}")
    if sites_without_supervisor.exists():
        for s in sites_without_supervisor:
            print(f"  - {s.name}")

if __name__ == '__main__':
    inspect_invoices()
