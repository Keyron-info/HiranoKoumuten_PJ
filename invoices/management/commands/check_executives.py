from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()

class Command(BaseCommand):
    help = 'Check if executive users required for full approval flow exist'

    def handle(self, *args, **options):
        # List of required emails based on setup_approval_route.py
        required_emails = [
            'tanaka@hira-ko.jp',        # 部長
            'sakai@hira-ko.jp',         # 専務
            'maki@hira-ko.jp',          # 社長
            'honjo@oita-kakiemon.jp',   # 常務
        ]

        self.stdout.write("--- Checking Executive Users ---")
        all_exist = True
        for email in required_emails:
            user = User.objects.filter(email=email).first()
            if user:
                self.stdout.write(self.style.SUCCESS(f"[OK] Found: {user.get_full_name()} (ID: {user.id}) - {email} - {user.position}"))
            else:
                self.stdout.write(self.style.ERROR(f"[MISSING] Not found: {email}"))
                all_exist = False
        
        self.stdout.write("--------------------------------")
        
        if all_exist:
             self.stdout.write(self.style.SUCCESS("\nAll required users exist. You can run 'setup_approval_route' to restore the full flow."))
        else:
             self.stdout.write(self.style.WARNING("\nSome users are missing. You likely need to run 'create_hirano_users' first."))
