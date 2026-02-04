from django.core.management.base import BaseCommand
from invoices.models import User, Company, CustomerCompany, ConstructionSite
import datetime

class Command(BaseCommand):
    help = 'Setup E2E Test Data'

    def handle(self, *args, **options):
        # 1. Ensure Company exists
        company = Company.objects.first()
        if not company:
            self.stdout.write(self.style.ERROR('Company not found'))
            return

        # 2. Get Users
        try:
            supervisor = User.objects.get(username='supervisor_yamada')
            partner_user = User.objects.get(username='partner_test')
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR('Users not found. Run create_sample_users first.'))
            return

        site, created = ConstructionSite.objects.get_or_create(
            name='Special Test Site',
            defaults={
                'company': company,
                # 'address': 'Test Address', # Removed
                'supervisor': supervisor,
                'total_budget': 10000000,
                # 'status': 'in_progress', # Removed
                # 'description': 'For E2E Testing', # Removed
                'is_active': True,
                'client_name': 'Test Client',
                'prime_contractor': 'Test Contractor'
            }
        )
        
        # Set Special Password
        site.special_access_password = 'special123'
        site.special_access_password_expiry = datetime.date.today() + datetime.timedelta(days=30)
        site.supervisor = supervisor # Ensure supervisor is set
        site.save()

        self.stdout.write(self.style.SUCCESS(f'Site setup complete: {site.name}'))
        self.stdout.write(self.style.SUCCESS(f'Special Password: {site.special_access_password}'))
        self.stdout.write(self.style.SUCCESS(f'Supervisor: {site.supervisor.username}'))
