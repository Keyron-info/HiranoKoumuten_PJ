from django.db import migrations
from django.contrib.auth.hashers import make_password

def update_users_and_routes(apps, schema_editor):
    User = apps.get_model('invoices', 'User')
    Company = apps.get_model('invoices', 'Company')
    ApprovalRoute = apps.get_model('invoices', 'ApprovalRoute')
    ApprovalStep = apps.get_model('invoices', 'ApprovalStep')
    
    # 1. Company Setup (Ensure)
    company, _ = Company.objects.get_or_create(name='平野工務店', defaults={
        'email': 'info@hira-ko.jp', 'phone': '03-0000-0000', 'address': 'Tokyo'
    })
    
    default_password = make_password('test1234')
    
    # 2. Force Create/Update Tanaka (Department Manager) - ABSOLUTELY CRITICAL
    # We use get_or_create to ensure he exists, then force update fields.
    tanaka_email = 'tanaka@hira-ko.jp'
    
    # Try to find by email first (case insensitive if needed, but standard is exact)
    tanaka = User.objects.filter(email=tanaka_email).first()
    
    if not tanaka:
        # Create if not exists
        tanaka = User.objects.create(
            username=tanaka_email,
            email=tanaka_email,
            password=default_password,
            first_name='一朗',
            last_name='田中',
            position='department_manager',
            user_type='internal',
            company=company,
            is_active=True
        )
    else:
        # Force update if exists
        tanaka.username = tanaka_email # Ensure username matches email
        tanaka.first_name = '一朗'
        tanaka.last_name = '田中'
        tanaka.position = 'department_manager'
        tanaka.user_type = 'internal'
        tanaka.company = company
        tanaka.is_active = True
        tanaka.password = default_password
        tanaka.save()
        
    # 2.2 Force Create/Update Jomu (Managing Director)
    jomu_email = 'maki@hira-ko.jp'
    jomu, _ = User.objects.get_or_create(email=jomu_email, defaults={
        'username': jomu_email, 'first_name': '宣之', 'last_name': '眞木', 'position': 'managing_director',
        'user_type': 'internal', 'company': company, 'is_active': True, 'password': default_password
    })
    if jomu.position != 'managing_director' or not jomu.is_active:
        jomu.position = 'managing_director'
        jomu.is_active = True
        jomu.save()

    # 2.3 Force Create/Update Shacho (President)
    shacho_email = 'sakai@hira-ko.jp'
    shacho, _ = User.objects.get_or_create(email=shacho_email, defaults={
        'username': shacho_email, 'first_name': '仁一郎', 'last_name': '堺', 'position': 'president',
        'user_type': 'internal', 'company': company, 'is_active': True, 'password': default_password
    })
    if shacho.position != 'president' or not shacho.is_active:
        shacho.position = 'president'
        shacho.is_active = True
        shacho.save()

    # 2.4 Force Create/Update Senmu (Senior Managing Director)
    senmu_email = 'honjo@oita-kakiemon.jp'
    senmu, _ = User.objects.get_or_create(email=senmu_email, defaults={
        'username': senmu_email, 'first_name': '美代子', 'last_name': '本城', 'position': 'senior_managing_director',
        'user_type': 'internal', 'company': company, 'is_active': True, 'password': default_password
    })
    if senmu.position != 'senior_managing_director' or not senmu.is_active:
        senmu.position = 'senior_managing_director'
        senmu.is_active = True
        senmu.save()
    
    # 2.5 Force Accountants (Takeda) - Often problematic
    takeda_email = 'takeda@hira-ko.jp'
    takeda, _ = User.objects.get_or_create(email=takeda_email, defaults={
        'username': takeda_email, 'first_name': '鉄也', 'last_name': '竹田', 'position': 'accountant',
        'user_type': 'internal', 'company': company, 'is_active': True, 'password': default_password
    })
    if takeda.position != 'accountant' or not takeda.is_active:
        takeda.position = 'accountant'
        takeda.is_active = True
        takeda.save()

    # 3. Approval Route Setup
    # Cleanup previous routes
    ApprovalRoute.objects.filter(company=company).delete()

    route = ApprovalRoute.objects.create(
        company=company, 
        name='標準承認ルート(Fix-All)', 
        is_default=True, 
        is_active=True
    )
    
    # Define Steps INDIVIDUALLY to force them
    # Order: Genba -> Bucho -> Jomu -> Pres -> Senmu -> Account
    
    # 1. Genba
    ApprovalStep.objects.create(
        route=route, step_order=1, step_name='現場監督承認', 
        approver_position='site_supervisor', approver_user=None, is_required=True
    )
    
    # 2. Bucho (Tanaka)
    ApprovalStep.objects.create(
        route=route, step_order=2, step_name='部長承認', 
        approver_position='department_manager', approver_user=tanaka, is_required=True
    )
    
    # 3. Jomu (Maki)
    ApprovalStep.objects.create(
        route=route, step_order=3, step_name='常務承認', 
        approver_position='managing_director', approver_user=jomu, is_required=True
    )
         
    # 4. Shacho (Sakai)
    ApprovalStep.objects.create(
        route=route, step_order=4, step_name='社長承認', 
        approver_position='president', approver_user=shacho, is_required=True
    )
        
    # 5. Senmu (Honjo)
    ApprovalStep.objects.create(
        route=route, step_order=5, step_name='専務承認', 
        approver_position='senior_managing_director', approver_user=senmu, is_required=True
    )
        
    # 6. Keiri
    ApprovalStep.objects.create(
        route=route, step_order=6, step_name='経理承認', 
        approver_position='accountant', approver_user=None, is_required=True
    )

def reverse_func(apps, schema_editor):
    pass

class Migration(migrations.Migration):

    dependencies = [
        ('invoices', '0019_fix_approval_route_final'),
    ]

    operations = [
        migrations.RunPython(update_users_and_routes, reverse_func),
    ]
