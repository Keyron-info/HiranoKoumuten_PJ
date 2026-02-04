from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from invoices.models import Company, CustomerCompany, ConstructionSite, Invoice
import datetime

User = get_user_model()

class Command(BaseCommand):
    help = 'Reset users and data for E2E testing'

    def handle(self, *args, **options):
        # 1. Get Internal Company
        company = Company.objects.first()
        if not company:
            company = Company.objects.create(name='Hirano Koumuten', tax_number='1234567890123')
            self.stdout.write(f'Created Company: {company.name}')

        # 2. Get Customer Company
        customer_company, _ = CustomerCompany.objects.get_or_create(
            name='E2E Partner Co.',
            defaults={
                'tax_number': '9876543210987',
                'postal_code': '100-0001',
                'address': 'Tokyo',
                'email': 'partner_company@example.com',
                'business_type': 'subcontractor'
            }
        )
        
        # 3. Create/Update Users
        users_data = [
            {'email': 'supervisor@hirano.co.jp', 'username': 'supervisor_e2e', 'role': 'internal', 'position': 'site_supervisor', 'last_name': 'Yamada', 'first_name': 'Supervisor'},
            {'email': 'jomu@hirano.co.jp', 'username': 'jomu_e2e', 'role': 'internal', 'position': 'managing_director', 'last_name': 'Suzuki', 'first_name': 'Jomu'},
            {'email': 'senmu@hirano.co.jp', 'username': 'senmu_e2e', 'role': 'internal', 'position': 'senior_managing_director', 'last_name': 'Tanaka', 'first_name': 'Senmu'},
            {'email': 'president@hirano.co.jp', 'username': 'president_e2e', 'role': 'internal', 'position': 'president', 'last_name': 'Hirano', 'first_name': 'President'},
            {'email': 'keiri@hirano.co.jp', 'username': 'keiri_e2e', 'role': 'internal', 'position': 'accountant', 'last_name': 'Sato', 'first_name': 'Accountant'},
            {'email': 'admin@hirano.co.jp', 'username': 'admin_e2e', 'role': 'internal', 'position': 'system_admin', 'last_name': 'Yamamoto', 'first_name': 'Admin', 'is_staff': True, 'is_superuser': True},
            # Partner
            {'email': 'partner@hirano.co.jp', 'username': 'partner_e2e', 'role': 'customer', 'position': 'staff', 'last_name': 'Partner', 'first_name': 'User', 'customer_company': customer_company},
        ]

        for u in users_data:
            # Handle Duplicates: Get the first one, delete others if necessary (optional, but safer to just pick one)
            users = User.objects.filter(email=u['email'])
            if users.exists():
                user = users.first()
                # If there are duplicates, maybe clean them up?
                # For safety, let's just use the first match and update it.
            else:
                user = User.objects.create(
                    email=u['email'],
                    username=u['username'],
                    user_type=u['role'],
                    last_name=u['last_name'],
                    first_name=u['first_name']
                )
            
            # Update fields
            user.user_type = u['role']
            # Only update username if it's not conflicting with another user?
            # Actually, let's rely on email as the primary identity for this reset.
            if user.username != u['username']:
                 # check if desired username exists
                 if not User.objects.filter(username=u['username']).exists():
                     user.username = u['username']
            
            if 'position' in u:
                user.position = u['position']
            if 'customer_company' in u:
                user.customer_company = u['customer_company']
            if 'is_staff' in u:
                user.is_staff = u['is_staff']
            if 'is_superuser' in u:
                user.is_superuser = u['is_superuser']
            
            user.set_password('Test1234!')
            user.save()
            self.stdout.write(f'User updated: {user.email} / Test1234!')

        # 4. Create/Update Site
        supervisor = User.objects.filter(email='supervisor@hirano.co.jp').first()
        site, created = ConstructionSite.objects.get_or_create(
            name='E2E Test Site Final',
            defaults={
                'company': company,
                'client_name': 'E2E Client',
                'prime_contractor': 'E2E Prime',
                'supervisor': supervisor,
                'total_budget': 10000000,
                'is_active': True
            }
        )
        site.supervisor = supervisor
        site.special_access_password = 'auto123'
        site.special_access_password_expiry = datetime.date.today() + datetime.timedelta(days=30)
        site.save()
        self.stdout.write(f'Site updated: {site.name} (Pass: {site.special_access_password})')

        # 5. Clean up Draft Invoices for this site
        deleted, _ = Invoice.objects.filter(construction_site=site, status='draft').delete()
        self.stdout.write(f'Deleted {deleted} draft invoices for this site.')

        self.stdout.write(self.style.SUCCESS('Reset complete.'))
