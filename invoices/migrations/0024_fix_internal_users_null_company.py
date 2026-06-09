"""
データマイグレーション: company=None の社内ユーザーを一括修正

UIからユーザーを追加した際に company が未設定になるバグへの対処。
client タイプの会社を取得し、未設定の社内ユーザー全員に割り当てる。
"""

from django.db import migrations


def fix_internal_users_null_company(apps, schema_editor):
    User = apps.get_model('invoices', 'User')
    Company = apps.get_model('invoices', 'Company')

    # client タイプの会社を取得（なければ is_active な会社を使用）
    company = (
        Company.objects.filter(company_type='client', is_active=True).first()
        or Company.objects.filter(is_active=True).first()
    )

    if not company:
        print('[migration 0024] 有効な会社レコードが見つからないためスキップします')
        return

    targets = User.objects.filter(user_type='internal', company__isnull=True)
    count = targets.count()

    if count == 0:
        print('[migration 0024] 対象ユーザーなし（スキップ）')
        return

    targets.update(company=company)
    print(f'[migration 0024] {count} 名の社内ユーザーに "{company.name}" を設定しました')


def reverse_migration(apps, schema_editor):
    # 元に戻す操作は安全のため何もしない
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('invoices', '0023_customercompany_fax_and_more'),
    ]

    operations = [
        migrations.RunPython(
            fix_internal_users_null_company,
            reverse_migration,
        ),
    ]
