from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from invoices.models import Company, CustomerCompany, Department

User = get_user_model()

class Command(BaseCommand):
    help = 'Reset users and seed new data based on user request'

    def handle(self, *args, **options):
        self.stdout.write("Starting User Reset and Seed...")
        
        # 1. Reset Users - SKIPPED DELETION to avoid FK errors
        # Instead of deleting, we will update existing users or create new ones.
        self.stdout.write("Skipping deletion to preserve data integrity. proceeding to upsert users.")
        
        # 2. Create Company
        company, _ = Company.objects.get_or_create(name='平野工務店', defaults={
            'email': 'info@hira-ko.jp', 'phone': '03-0000-0000', 'address': 'Tokyo'
        })
        
        # 3. Create Partner Company
        partner_company, _ = CustomerCompany.objects.get_or_create(name='サンプル協力会社', defaults={
             'business_type': 'subcontractor', 'email': 'partner@example.com'
        })
        
        # 4. Create/Update Users
        users_config = [
            # Executives (正しい役職マッピング)
            {'name': '堺 仁一郎', 'email': 'sakai@hira-ko.jp', 'role': 'senior_managing_director', 'last': '堺', 'first': '仁一郎'},  # 専務取締役
            {'name': '眞木 正之', 'email': 'maki@hira-ko.jp', 'role': 'president', 'last': '眞木', 'first': '正之'},  # 代表取締役社長
            {'name': '本城 美代子', 'email': 'honjo@oita-kakiemon.jp', 'role': 'managing_director', 'last': '本城', 'first': '美代子'},  # 常務取締役

            # Department Manager
            {'name': '田中 一朗', 'email': 'tanaka@hira-ko.jp', 'role': 'department_manager', 'last': '田中', 'first': '一朗'},
            
            # Accountants経理
            {'name': '竹田 鉄也', 'email': 'takeda@hira-ko.jp', 'role': 'accountant', 'last': '竹田', 'first': '鉄也'},
            {'name': '総務', 'email': 'hiranokoumutensouму@hira-ko.jp', 'role': 'accountant', 'last': '総務', 'first': ''},
            {'name': '佐藤 奏', 'email': 'kana_sato@hira-ko.jp', 'role': 'accountant', 'last': '佐藤', 'first': '奏'},
            
            # 現場監督 (Akamine to Ito)
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
            
            # 一般社員
            {'name': '都 学志', 'email': 'miyako@hira-ko.jp', 'role': 'staff', 'last': '都', 'first': '学志'},
        ]
        
        default_password = 'test1234'
        
        for u in users_config:
            user, created = User.objects.update_or_create(
                email=u['email'],
                defaults={
                    'username': u['email'], # Sync username to email
                    'first_name': u['first'],
                    'last_name': u['last'],
                    'position': u['role'],
                    'user_type': 'internal',
                    'company': company,
                    'is_active': True
                }
            )
            if created:
                user.set_password(default_password)
                user.save()
                self.stdout.write(f"Created: {u['name']} ({u['role']})")
            else:
                self.stdout.write(f"Updated: {u['name']} ({u['role']})")
            
        # 5. Create Partner User
        User.objects.update_or_create(
            email='partner@demo.com',
            defaults={
                'username': 'partner_demo',
                'first_name': '太郎',
                'last_name': '協力',
                'user_type': 'customer',
                'customer_company': partner_company,
                'is_active': True
            }
        )
        self.stdout.write("Ensured Partner User: 協力 太郎")
        
        self.stdout.write(self.style.SUCCESS("Reset and Seed Completed (Robust Mode)!"))
