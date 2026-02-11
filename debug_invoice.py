import os
import django
from django.conf import settings

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'keyron_project.settings')
django.setup()

from invoices.models import Invoice, User, ApprovalStep

def debug_invoice():
    invoice_number = 'INV-2026-0010'
    print(f"=== Debugging {invoice_number} ===")
    
    try:
        invoice = Invoice.objects.get(invoice_number=invoice_number)
    except Invoice.DoesNotExist:
        print(f"❌ Invoice {invoice_number} not found!")
        return

    print(f"Status: {invoice.status}")
    print(f"Current Step: {invoice.current_approval_step}")
    
    approver = invoice.current_approver
    if approver:
        print(f"Current Approver: {approver.get_full_name()} (ID: {approver.id}, Email: {approver.email})")
    else:
        print("Current Approver: None")

    print("\n--- Route Configuration ---")
    if invoice.current_approval_step:
        step = invoice.current_approval_step
        print(f"Step Name: {step.step_name}")
        print(f"Defined Approver User: {step.approver_user}")
        print(f"Defined Position: {step.approver_position}")

    print("\n--- Check Honjo User ---")
    honjo = User.objects.filter(email='honjo@oita-kakiemon.jp').first()
    if honjo:
         print(f"Honjo User found: {honjo.get_full_name()} (ID: {honjo.id})")
         print(f"Position: {honjo.position}")
         if approver and approver.id != honjo.id:
             print("❌ Mismatch! Current approver is NOT Honjo.")
    else:
        print("❌ Honjo user not found in DB!")

    print("\n--- All Managing Directors ---")
    mds = User.objects.filter(position='managing_director')
    for u in mds:
        print(f"- {u.get_full_name()} (ID: {u.id}, Email: {u.email})")

if __name__ == '__main__':
    debug_invoice()
