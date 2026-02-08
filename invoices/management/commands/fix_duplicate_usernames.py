from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db.models import Count

User = get_user_model()

class Command(BaseCommand):
    help = 'ユーザー名の重複を解決（usernameをemailに統一）'

    def handle(self, *args, **options):
        self.stdout.write('🔄 ユーザー名の重複をチェック中...')
        
        # 重複しているusernameを検出
        duplicates = User.objects.values('username').annotate(
            count=Count('username')
        ).filter(count__gt=1)
        
        if duplicates.exists():
            self.stdout.write(self.style.WARNING(f'⚠️  {duplicates.count()}件の重複usernameを検出'))
            for dup in duplicates:
                users = User.objects.filter(username=dup['username'])
                self.stdout.write(f"  - '{dup['username']}': {users.count()}件")
                for user in users:
                    self.stdout.write(f"      ID:{user.id}, Email:{user.email}")
        
        # すべてのユーザーのusernameをemailに更新
        self.stdout.write('\n🔄 全ユーザーのusernameをemailに更新中...')
        
        updated_count = 0
        for user in User.objects.all():
            if user.username != user.email:
                old_username = user.username
                user.username = user.email
                try:
                    user.save()
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'✅ 更新: {old_username} → {user.email}'
                        )
                    )
                    updated_count += 1
                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(
                            f'❌ エラー ({user.email}): {str(e)}'
                        )
                    )
        
        self.stdout.write('\n' + '='*60)
        self.stdout.write(
            self.style.SUCCESS(
                f'\n✨ 完了: {updated_count}件のユーザー名を更新しました'
            )
        )
        self.stdout.write('\n' + '='*60)
        
        # 重複チェック（再確認）
        duplicates_after = User.objects.values('username').annotate(
            count=Count('username')
        ).filter(count__gt=1)
        
        if duplicates_after.exists():
            self.stdout.write(
                self.style.ERROR(
                    f'\n❌ まだ{duplicates_after.count()}件の重複が存在します'
                )
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    '\n✅ 重複は解消されました！'
                )
            )
