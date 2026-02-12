from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()

class Command(BaseCommand):
    help = 'Check if executive users required for full approval flow exist'

    def handle(self, *args, **options):
        # 承認フローに必要なユーザーのメールアドレス
        required_emails = [
            ('nagamine@hira-ko.jp', '部長'),
            ('maki@hira-ko.jp', '専務'),
            ('sakai@hira-ko.jp', '社長'),
            ('honjo@oita-kakiemon.jp', '常務'),
            ('takeda@hira-ko.jp', '経理'),
        ]

        self.stdout.write("--- 承認フロー必要ユーザー確認 ---")
        all_exist = True
        for email, role in required_emails:
            user = User.objects.filter(email=email).first()
            if user:
                self.stdout.write(self.style.SUCCESS(
                    f"[OK] {role}: {user.last_name} {user.first_name} (ID:{user.id}) - {email} - position:{user.position}"
                ))
            else:
                self.stdout.write(self.style.ERROR(f"[MISSING] {role}: {email}"))
                all_exist = False
        
        self.stdout.write("--------------------------------")
        
        if all_exist:
            self.stdout.write(self.style.SUCCESS("\n✅ 全ての必要ユーザーが存在します。"))
        else:
            self.stdout.write(self.style.WARNING("\n⚠️ 一部ユーザーが不足しています。'create_hirano_users' を実行してください。"))
