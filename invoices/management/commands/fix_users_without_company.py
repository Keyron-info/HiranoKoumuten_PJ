from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from invoices.models import Company

User = get_user_model()


class Command(BaseCommand):
    help = 'company が未設定の社内ユーザーにデフォルト会社を設定する'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='実際には更新せず、対象ユーザーを表示するだけ',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']

        # 対象ユーザーを取得
        targets = User.objects.filter(user_type='internal', company__isnull=True)

        if not targets.exists():
            self.stdout.write(self.style.SUCCESS('✅ company が未設定の社内ユーザーはいません'))
            return

        self.stdout.write(f'\n対象ユーザー数: {targets.count()} 名\n')
        for u in targets:
            self.stdout.write(f'  - {u.last_name} {u.first_name} ({u.email})')

        # デフォルト会社を取得（client タイプの会社を優先）
        company = (
            Company.objects.filter(company_type='client', is_active=True).first()
            or Company.objects.filter(is_active=True).first()
        )

        if not company:
            self.stdout.write(self.style.ERROR('\n❌ 有効な会社レコードが見つかりません。先に会社を登録してください。'))
            return

        self.stdout.write(f'\n設定する会社: {company.name} (id={company.id})')

        if dry_run:
            self.stdout.write(self.style.WARNING('\n[DRY RUN] --dry-run フラグが指定されているため更新しません'))
            return

        # 一括更新
        updated = targets.update(company=company)

        self.stdout.write('\n' + '=' * 60)
        self.stdout.write(
            self.style.SUCCESS(f'\n✅ 完了: {updated} 名のユーザーに "{company.name}" を設定しました')
        )
        self.stdout.write('=' * 60 + '\n')
