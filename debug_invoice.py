import os
import django
from django.conf import settings

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'keyron_project.settings')
django.setup()

from invoices.models import Invoice, User, ApprovalStep

import argparse
import sys

def debug_invoice():
    parser = argparse.ArgumentParser(description='Debug Invoice State')
    parser.add_argument('invoice_number', nargs='?', default='INV-2026-0010', help='Invoice Number to debug')
    args = parser.parse_args()
    
    invoice_number = args.invoice_number
    
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
        print(f"Approver Position: {approver.position}")
    else:
        print("Current Approver: None")

    print("\n--- Route Configuration ---")
    if invoice.current_approval_step:
        step = invoice.current_approval_step
        print(f"Step Name: {step.step_name}")
        print(f"Step Order: {step.step_order}")
        print(f"Defined Approver User: {step.approver_user}")
        print(f"Defined Position: {step.approver_position}")

    print("\n--- Check Tanaka (Dept Manager) ---")
    tanaka = User.objects.filter(email='tanaka@hira-ko.jp').first()
    if tanaka:
         print(f"Tanaka User found: {tanaka.get_full_name()} (ID: {tanaka.id})")
         print(f"Position: {tanaka.position}")
    else:
        print("❌ Tanaka user not found in DB!")

if __name__ == '__main__':
    debug_invoice()
