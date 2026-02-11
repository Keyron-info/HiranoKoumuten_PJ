import os
import django
from django.conf import settings

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'keyron_project.settings')
django.setup()

from django.contrib.auth import get_user_model
from invoices.models import ApprovalRoute, ApprovalStep

User = get_user_model()

def inspect_users():
    print("=== Inspecting Users ===")
    
    # Check for duplicate emails
    print("\n--- Checking for Duplicate Emails ---")
    users = User.objects.all().order_by('email')
    email_counts = {}
    for user in users:
        email = user.email
        if email in email_counts:
            email_counts[email].append(user)
        else:
            email_counts[email] = [user]
            
    duplicates_found = False
    for email, user_list in email_counts.items():
        if len(user_list) > 1:
            duplicates_found = True
            print(f"⚠️  Duplicate Email Found: {email}")
            for u in user_list:
                print(f"    - ID: {u.id}, Username: {u.username}, Active: {u.is_active}, Last Login: {u.last_login}")

    if not duplicates_found:
        print("✅ No duplicate emails found.")

    # Check Tanaka specifically
    print("\n--- Inspecting Tanaka User ---")
    tanakas = User.objects.filter(email__icontains='tanaka')
    if not tanakas.exists():
        print("❌ No user with 'tanaka' in email found!")
    
    for u in tanakas:
        print(f"ID: {u.id}")
        print(f"Username: {u.username}")
        print(f"Email: {u.email}")
        print(f"Position: {u.position}")
        print(f"Is Active: {u.is_active}")
        print("-" * 20)

    # Check Approval Route
    print("\n--- Inspecting Approval Route ---")
    routes = ApprovalRoute.objects.filter(is_default=True)
    if not routes.exists():
        print("❌ No default approval route found!")
    
    for route in routes:
        print(f"Route: {route.name} (ID: {route.id}, Active: {route.is_active})")
        
        steps = route.steps.all().order_by('step_order')
        for step in steps:
            approver_info = "None"
            if step.approver_user:
                approver_info = f"{step.approver_user.get_full_name()} (ID: {step.approver_user.id}, Email: {step.approver_user.email})"
            
            print(f"  Step {step.step_order}: {step.step_name}")
            print(f"    Position: {step.approver_position}")
            print(f"    Assigned User: {approver_info}")

if __name__ == '__main__':
    inspect_users()
