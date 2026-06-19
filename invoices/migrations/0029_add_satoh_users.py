"""
佐藤 武士 (t-satoh@hira-ko.jp, 現場監督) と
佐藤 新市 (s-satoh@hira-ko.jp, 現場監督) を追加する。
既にメールが存在する場合はスキップ。
"""
from django.db import migrations


def add_satoh_users(apps, schema_editor):
    User = apps.get_model('invoices', 'User')

    users_to_add = [
        {
            'email': 't-satoh@hira-ko.jp',
            'last_name': '佐藤',
            'first_name': '武士',
            'position': 'site_supervisor',
            'user_type': 'internal',
        },
        {
            'email': 's-satoh@hira-ko.jp',
            'last_name': '佐藤',
            'first_name': '新市',
            'position': 'site_supervisor',
            'user_type': 'internal',
        },
    ]

    for data in users_to_add:
        if User.objects.filter(email=data['email']).exists():
            print(f"[migration 0029] スキップ: {data['email']} は既に存在します")
            continue

        user = User(
            username=data['email'],
            email=data['email'],
            last_name=data['last_name'],
            first_name=data['first_name'],
            position=data['position'],
            user_type=data['user_type'],
            is_active=True,
            is_staff=False,
        )
        user.set_password('hirano2024!')
        user.save()
        print(f"[migration 0029] 追加: {data['last_name']} {data['first_name']} ({data['email']})")


def reverse_migration(apps, schema_editor):
    User = apps.get_model('invoices', 'User')
    for email in ('t-satoh@hira-ko.jp', 's-satoh@hira-ko.jp'):
        User.objects.filter(email=email).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('invoices', '0028_fix_hirano_user_names'),
    ]

    operations = [
        migrations.RunPython(add_satoh_users, reverse_migration),
    ]
