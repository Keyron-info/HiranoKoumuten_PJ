from django.core.management.base import BaseCommand
from django.core.management import call_command
from django.contrib.auth import get_user_model
from invoices.models import (
    Company, CustomerCompany, ConstructionSite, Invoice, InvoiceItem,
    ApprovalRoute, ApprovalStep, ApprovalHistory
)
from django.utils import timezone
from datetime import timedelta
import sys

User = get_user_model()

class Command(BaseCommand):
    help = 'Verify the 6-step approval flow (Supervisor -> Dept Manager -> Senior MD -> President -> MD -> Accountant)'

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING('🚀 Starting Full Approval Flow Verification...'))

        # 1. Run Setup Commands
        self.stdout.write(self.style.HTTP_INFO('\n1️⃣  Running System Setup...'))
        
        self.stdout.write('   Running migrations...')
        call_command('migrate', interactive=False, verbosity=0)
        
        self.stdout.write('   Creating/Updating Users...')
        call_command('create_hirano_users', verbosity=0)
        
        self.stdout.write('   Setting up Approval Routes...')
        call_command('setup_approval_route', verbosity=0)
        
        self.stdout.write(self.style.SUCCESS('   ✅ System Setup Complete.'))

        # 2. Prepare Test Data
        self.stdout.write(self.style.HTTP_INFO('\n2️⃣  Preparing Test Data...'))
        
        # Get Users
        try:
            supervisor = User.objects.get(email='akamine@hira-ko.jp') # 赤嶺 (Site Supervisor)
            dept_manager = User.objects.get(email='tanaka@hira-ko.jp') # 田中 一朗 (Dept Manager)
            senior_md = User.objects.get(email='sakai@hira-ko.jp') # 堺 (Senior MD)
            president = User.objects.get(email='maki@hira-ko.jp') # 眞木 (President)
            md = User.objects.get(email='honjo@oita-kakiemon.jp') # 本城 (MD)
            accountant = User.objects.get(email='takeda@hira-ko.jp') # 竹田 (Accountant)
            
            # Create a Partner User for testing
            partner_company, _ = CustomerCompany.objects.get_or_create(
                name='Test Partner Co.',
                defaults={
                    'email': 'test_partner@example.com',
                    'business_type': 'subcontractor'
                }
            )
            
            partner_user, _ = User.objects.get_or_create(
                email='partner_test@example.com',
                defaults={
                    'username': 'partner_test@example.com',
                    'user_type': 'customer',
                    'customer_company': partner_company,
                    'is_active': True
                }
            )
            if not partner_user.check_password('test1234'):
                partner_user.set_password('test1234')
                partner_user.save()

            # Create Construction Site
            company = Company.objects.first()
            site, _ = ConstructionSite.objects.get_or_create(
                name='Test Construction Site A',
                defaults={
                    'company': company,
                    'supervisor': supervisor,
                    'is_active': True
                }
            )
            # Ensure supervisor is set correctly (in case it was created differently before)
            if site.supervisor != supervisor:
                site.supervisor = supervisor
                site.save()

        except User.DoesNotExist as e:
            self.stdout.write(self.style.ERROR(f'   ❌ Missing required user: {e}'))
            return

        self.stdout.write(self.style.SUCCESS('   ✅ Test Data Prepared.'))

        # 3. Create & Submit Invoice
        self.stdout.write(self.style.HTTP_INFO('\n3️⃣  Creating & Submitting Invoice...'))
        
        invoice = Invoice.objects.create(
            receiving_company=company,
            customer_company=partner_company,
            construction_site=site,
            created_by=partner_user,
            project_name='Test Project for Approval Flow',
            issue_date=timezone.now().date(),
            payment_due_date=timezone.now().date() + timedelta(days=30),
            status='draft',
            total_amount=100000,
            tax_amount=10000
        )
        
        InvoiceItem.objects.create(
            invoice=invoice,
            item_number=1,
            description='Test Item',
            quantity=1,
            unit_price=100000,
            amount=100000
        )

        # Submit Invoice (Logic from InvoiceViewSet.submit)
        approval_route = ApprovalRoute.objects.filter(
            company=invoice.receiving_company, is_default=True, is_active=True
        ).first()
        
        if not approval_route:
             self.stdout.write(self.style.ERROR('   ❌ No default approval route found.'))
             return

        first_step = approval_route.steps.filter(step_order=1).first()
        invoice.approval_route = approval_route
        invoice.current_approval_step = first_step
        invoice.current_approver = invoice.construction_site.supervisor # Should be Akamine
        invoice.status = 'pending_approval'
        invoice.save()
        
        self.stdout.write(f'   Invoice {invoice.invoice_number} submitted.')
        self.verify_state(invoice, 'pending_approval', supervisor, 'Site Supervisor')


        # 4. Approval Steps
        approvers_sequence = [
            (supervisor, 'Site Supervisor (Akamine)', 1),
            (dept_manager, 'Dept Manager (Tanaka)', 2),
            (senior_md, 'Senior MD (Sakai)', 3),
            (president, 'President (Maki)', 4),
            (md, 'Managing Director (Honjo)', 5),
            (accountant, 'Accountant (Takeda)', 6)
        ]

        for approver, role_name, step_order in approvers_sequence:
            self.stdout.write(self.style.HTTP_INFO(f'\n🔹 Step {step_order}: Approving by {role_name}...'))
            
            # Refresh invoice
            invoice.refresh_from_db()
            
            # Verify Current Approver (Accountant step is special, approver_user might be None in step definition but logic might handle it)
            # In setup_approval_route.py, Step 6 (Accountant) has user=None.
            # In InvoiceViewSet.approve logic, if user=None, it searches by position.
            
            # Logic to approve
            self.approve_invoice(invoice, approver)
            
            # Verify Next State
            invoice.refresh_from_db()
            
            if step_order < 6:
                next_approver_tuple = approvers_sequence[step_order] # index matches next step order (0-indexed list vs 1-indexed step)
                next_approver = next_approver_tuple[0]
                next_role = next_approver_tuple[1]
                self.verify_state(invoice, 'pending_approval', next_approver, next_role)
            else:
                 self.verify_final_state(invoice)

        self.stdout.write(self.style.SUCCESS('\n🎉 ALL CHECKS PASSED! The approval flow is working correctly.'))


    def verify_state(self, invoice, expected_status, expected_approver, role_name):
        if invoice.status != expected_status:
            self.stdout.write(self.style.ERROR(f'   ❌ Status Mismatch! Expected: {expected_status}, Got: {invoice.status}'))
            sys.exit(1)
        
        # For accountant step, create logic might assign specific user or any accountant. 
        # But our setup logic assigns specific users for positions except Accountant.
        # However, for Step 6, the View logic searches for a user with position='accountant'. Takeda is one.
        # If invoice.current_approver is Takeda (or any accountant), it's fine.
        
        # If expected_approver is Accountant, we might need loose check if there are multiple.
        # But creates_hirano_users makes Takeda, Ikuse, Cato. Takeda is usually first found.
        
        if invoice.current_approver != expected_approver:
             # Special case for Accountant if multiple exist
             if expected_approver.position == 'accountant' and invoice.current_approver.position == 'accountant':
                 pass # OK
             else:
                self.stdout.write(self.style.ERROR(f'   ❌ Approver Mismatch at {role_name}! Expected: {expected_approver.get_full_name()}, Got: {invoice.current_approver.get_full_name() if invoice.current_approver else "None"}'))
                sys.exit(1)
        
        self.stdout.write(self.style.SUCCESS(f'   ✅ Verified: Status is {invoice.status}, Waiting for {role_name}'))

    def verify_final_state(self, invoice):
        if invoice.status != 'approved':
            self.stdout.write(self.style.ERROR(f'   ❌ Final Status Mismatch! Expected: approved, Got: {invoice.status}'))
            sys.exit(1)
        if invoice.current_approver is not None:
             self.stdout.write(self.style.ERROR(f'   ❌ Final Approver Mismatch! Expected: None, Got: {invoice.current_approver}'))
             sys.exit(1)
        self.stdout.write(self.style.SUCCESS(f'   ✅ Verified: Final Status is APPROVED.'))

    def approve_invoice(self, invoice, approver):
        # Simulation of InvoiceViewSet.approve logic
        
        # 1. Create History
        ApprovalHistory.objects.create(
            invoice=invoice,
            approval_step=invoice.current_approval_step,
            user=approver,
            action='approved',
            comment=f'Approved by {approver.get_full_name()}'
        )
        
        # 2. Move to next step
        current_step_order = invoice.current_approval_step.step_order
        next_step = invoice.approval_route.steps.filter(
            step_order=current_step_order + 1
        ).first()
        
        if next_step:
            invoice.current_approval_step = next_step
            
            if next_step.approver_user:
                invoice.current_approver = next_step.approver_user
            else:
                # Find by position
                next_approver = User.objects.filter(
                    user_type='internal',
                    company=invoice.receiving_company,
                    position=next_step.approver_position,
                    is_active=True
                ).first()
                
                if next_approver:
                    invoice.current_approver = next_approver
                else:
                    self.stdout.write(self.style.ERROR(f'   ❌ Could not find next approver for position: {next_step.approver_position}'))
                    sys.exit(1)
            
            invoice.save()
            self.stdout.write(f'   ➡️  Moved to Step {next_step.step_order}: {next_step.step_name}')
            
        else:
            invoice.status = 'approved'
            invoice.current_approval_step = None
            invoice.current_approver = None
            invoice.save()
            self.stdout.write(f'   🏁 Approval Chain Complete.')
