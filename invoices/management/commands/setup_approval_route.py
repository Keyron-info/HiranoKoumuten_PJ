from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from invoices.models import Company, ApprovalRoute, ApprovalStep

User = get_user_model()

class Command(BaseCommand):
    help = 'Setup new 6-step approval route (Genba -> Bucho -> Senmu -> Shacho -> Jomu -> Keiri)'

    def handle(self, *args, **options):
        company = Company.objects.first()
        if not company:
            self.stdout.write("No company found.")
            return
        
        self.stdout.write(f"Company found: {company.name}")

        # 1. Reset Routes
        ApprovalRoute.objects.filter(company=company).delete()
        
        route = ApprovalRoute.objects.create(
            company=company, 
            name='標準承認ルート(新)', 
            is_default=True, 
            is_active=True
        )

        # 2. Get Users
        # Mappings based on request:
        # Senmu = 本城 (Honjo)
        # Shacho = 堺 (Sakai)
        # Jomu = 眞木 (Maki)
        # Bucho = ? (Missing in list, will check for 'department_manager' role)

        senmu = User.objects.filter(email='honjo@oita-kakiemon.jp').first()
        shacho = User.objects.filter(email='sakai@hira-ko.jp').first()
        jomu = User.objects.filter(email='maki@hira-ko.jp').first()
        bucho = User.objects.filter(position='department_manager').first()

        # 3. Define Steps
        # Request: 現場監督 -> 部長 -> 専務 -> 社長 -> 常務 -> 経理
        steps_config = []
        
        # Step 1: Genba
        steps_config.append({
            'name': '現場監督承認', 'position': 'site_supervisor', 'user': None 
        })
        
        # Step 2: Bucho (Skip if not found)
        if bucho:
            steps_config.append({
                'name': '部長承認', 'position': 'department_manager', 'user': bucho
            })
        else:
             self.stdout.write(self.style.WARNING("⚠️ No Department Manager (Bucho) found. Skipping Bucho step."))

        # Step 3: Jomu (Maki) - Requested early
        if jomu:
            steps_config.append({
                'name': '常務承認', 'position': 'managing_director', 'user': jomu
            })
        
        # Step 4: Shacho (Sakai)
        if shacho:
            steps_config.append({
                'name': '社長承認', 'position': 'president', 'user': shacho
            })

        # Step 5: Senmu (Honjo) - Requested Last (after President)
        if senmu:
            steps_config.append({
                'name': '専務承認', 'position': 'senior_managing_director', 'user': senmu
            })

        # Step 6: Keiri (Any)
        steps_config.append({
            'name': '経理承認', 'position': 'accountant', 'user': None
        })

        # 4. Create Steps
        for i, step_data in enumerate(steps_config, 1):
            ApprovalStep.objects.create(
                route=route,
                step_order=i,
                step_name=step_data['name'],
                approver_position=step_data['position'],
                approver_user=step_data['user'],
                is_required=True
            )
            user_name = step_data['user'].get_full_name() if step_data['user'] else "Any/Site-files"
            self.stdout.write(f"Step {i}: {step_data['name']} ({user_name})")

        self.stdout.write(self.style.SUCCESS("Approval route setup complete!"))
