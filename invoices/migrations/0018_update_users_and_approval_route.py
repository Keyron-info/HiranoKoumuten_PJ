from django.db import migrations
from django.contrib.auth.hashers import make_password

def update_users_and_routes(apps, schema_editor):
    User = apps.get_model('invoices', 'User')
    Company = apps.get_model('invoices', 'Company')
    CustomerCompany = apps.get_model('invoices', 'CustomerCompany')
    ApprovalRoute = apps.get_model('invoices', 'ApprovalRoute')
    ApprovalStep = apps.get_model('invoices', 'ApprovalStep')
    
    # 1. Company Setup
    company, _ = Company.objects.get_or_create(name='平野工務店', defaults={
        'email': 'info@hira-ko.jp', 'phone': '03-0000-0000', 'address': 'Tokyo'
    })
    
    partner_company, _ = CustomerCompany.objects.get_or_create(name='サンプル協力会社', defaults={
         'business_type': 'subcontractor', 'email': 'partner@example.com'
    })
    
    # 2. User Upsert Logic
    users_config = [
        # Executives
        {'name': '堺 仁一郎', 'email': 'sakai@hira-ko.jp', 'role': 'president', 'last': '堺', 'first': '仁一郎'},
        {'name': '眞木 宣之', 'email': 'maki@hira-ko.jp', 'role': 'managing_director', 'last': '眞木', 'first': '宣之'},
        {'name': '本城 美代子', 'email': 'honjo@oita-kakiemon.jp', 'role': 'senior_managing_director', 'last': '本城', 'first': '美代子'},
        # Department Manager (The key fix)
        {'name': '田中 一朗', 'email': 'tanaka@hira-ko.jp', 'role': 'department_manager', 'last': '田中', 'first': '一朗'},
        # Accountants
        {'name': '竹田 鉄也', 'email': 'takeda@hira-ko.jp', 'role': 'accountant', 'last': '竹田', 'first': '鉄也'},
        {'name': '総務', 'email': 'hiranokoumutensouму@hira-ko.jp', 'role': 'accountant', 'last': '総務', 'first': ''},
        {'name': '佐藤 奏', 'email': 'kana_sato@hira-ko.jp', 'role': 'accountant', 'last': '佐藤', 'first': '奏'},
        # Site Supervisors
        {'name': '赤嶺 誠司', 'email': 'akamine@hira-ko.jp', 'role': 'site_supervisor', 'last': '赤嶺', 'first': '誠司'},
        {'name': '長峯 真美', 'email': 'nagamine@hira-ko.jp', 'role': 'site_supervisor', 'last': '長峯', 'first': '真美'},
        {'name': '稲吉 智紀', 'email': 'koumu3@hira-ko.jp', 'role': 'site_supervisor', 'last': '稲吉', 'first': '智紀'},
        {'name': '友永 真夫', 'email': 'tomonaga@hira-ko.jp', 'role': 'site_supervisor', 'last': '友永', 'first': '真夫'},
        {'name': '佐土原 圭', 'email': 'sadohara@hira-ko.jp', 'role': 'site_supervisor', 'last': '佐土原', 'first': '圭'},
        {'name': '佐藤 岳志', 'email': 'takeshi-s@hira-ko.jp', 'role': 'site_supervisor', 'last': '佐藤', 'first': '岳志'},
        {'name': '吉田 幸弘', 'email': 'yoshida@hira-ko.jp', 'role': 'site_supervisor', 'last': '吉田', 'first': '幸弘'},
        {'name': '相良 宏隆', 'email': 'koumu1@hira-ko.jp', 'role': 'site_supervisor', 'last': '相良', 'first': '宏隆'},
        {'name': '石本 充', 'email': 'ishimoto@hira-ko.jp', 'role': 'site_supervisor', 'last': '石本', 'first': '充'},
        {'name': '東 龍之亮', 'email': 'higashi@hira-ko.jp', 'role': 'site_supervisor', 'last': '東', 'first': '龍之亮'},
        {'name': '佐藤 雄太郎', 'email': 'yuutarou-s@hira-ko.jp', 'role': 'site_supervisor', 'last': '佐藤', 'first': '雄太郎'},
        {'name': '染矢 啓登', 'email': 'someya@hira-ko.jp', 'role': 'site_supervisor', 'last': '染矢', 'first': '啓登'},
        {'name': '伊藤 輝', 'email': 'ito@hira-ko.jp', 'role': 'site_supervisor', 'last': '伊藤', 'first': '輝'},
        # Staff
        {'name': '都 学志', 'email': 'miyako@hira-ko.jp', 'role': 'staff', 'last': '都', 'first': '学志'},
    ]
    
    default_password = make_password('test1234')
    
    for u in users_config:
        # Use simple filter update or create since we are in migration and managers might not work strictly as expected
        # Also direct object creation is safer in migrations than create_user helper sometimes
        user = User.objects.filter(email=u['email']).first()
        if user:
            user.username = u['email']
            user.first_name = u['first']
            user.last_name = u['last']
            user.position = u['role']
            user.user_type = 'internal'
            user.company = company
            user.is_active = True
            # Don't reset password for existing users to avoid disruption? 
            # User request implies "Reset", so maybe yes. But "test1234" is standard here.
            # Let's keep it safe: only if needed or requested. 
            # Actually user said "Reset". Let's force it.
            user.password = default_password 
            user.save()
        else:
            User.objects.create(
                username=u['email'],
                email=u['email'],
                password=default_password,
                first_name=u['first'],
                last_name=u['last'],
                position=u['role'],
                user_type='internal',
                company=company,
                is_active=True
            )

    # Partner User
    p_user = User.objects.filter(email='partner@demo.com').first()
    if not p_user:
        User.objects.create(
            username='partner_demo',
            email='partner@demo.com',
            password=default_password,
            first_name='太郎',
            last_name='協力',
            user_type='customer',
            customer_company=partner_company,
            is_active=True
        )

    # 3. Approval Route Setup
    # Force delete existing routes for this company to ensure clean slate
    # Note: If invoices reference these routes, they might get set to NULL (on_delete=SET_NULL)
    ApprovalRoute.objects.filter(company=company).delete()

    route = ApprovalRoute.objects.create(
        company=company, 
        name='標準承認ルート(最終版)', 
        is_default=True, 
        is_active=True
    )
    
    # Fetch Users for Steps
    senmu = User.objects.filter(email='honjo@oita-kakiemon.jp').first()
    shacho = User.objects.filter(email='sakai@hira-ko.jp').first()
    jomu = User.objects.filter(email='maki@hira-ko.jp').first()
    bucho = User.objects.filter(position='department_manager').first()
    
    # Define Steps: Genba -> Bucho -> Jomu -> Shacho -> Senmu -> Keiri
    steps_config = []
    
    # 1. Genba
    steps_config.append({'name': '現場監督承認', 'position': 'site_supervisor', 'user': None})
    
    # 2. Bucho
    if bucho:
        steps_config.append({'name': '部長承認', 'position': 'department_manager', 'user': bucho})
    
    # 3. Jomu
    if jomu:
         steps_config.append({'name': '常務承認', 'position': 'managing_director', 'user': jomu})
         
    # 4. Shacho
    if shacho:
        steps_config.append({'name': '社長承認', 'position': 'president', 'user': shacho})
        
    # 5. Senmu
    if senmu:
        steps_config.append({'name': '専務承認', 'position': 'senior_managing_director', 'user': senmu})
        
    # 6. Keiri
    steps_config.append({'name': '経理承認', 'position': 'accountant', 'user': None})
    
    for i, step_data in enumerate(steps_config, 1):
        ApprovalStep.objects.create(
            route=route,
            step_order=i,
            step_name=step_data['name'],
            approver_position=step_data['position'],
            approver_user=step_data['user'],
            is_required=True
        )

class Migration(migrations.Migration):

    dependencies = [
        ('invoices', '0017_add_department_manager_position'),
    ]

    operations = [
        migrations.RunPython(update_users_and_routes, reverse_func),
    ]
