"""
提出期限を「翌月末日」から「当月末日」に補正するデータマイグレーション。
受付ルール変更（毎月26日〜月末のみ受付）に伴う既存レコードの修正。
"""
import calendar
from datetime import date

from django.db import migrations


def fix_submission_deadlines(apps, schema_editor):
    MonthlyInvoicePeriod = apps.get_model('invoices', 'MonthlyInvoicePeriod')
    updated = 0
    for period in MonthlyInvoicePeriod.objects.all():
        last_day = calendar.monthrange(period.year, period.month)[1]
        new_deadline = date(period.year, period.month, last_day)
        if period.submission_deadline != new_deadline:
            period.submission_deadline = new_deadline
            period.save(update_fields=['submission_deadline'])
            updated += 1
    print(f'[migration 0027] {updated} 件の提出期限を当月末日に補正しました')


def reverse_migration(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('invoices', '0026_userregistrationrequest_bank_fields'),
    ]

    operations = [
        migrations.RunPython(fix_submission_deadlines, reverse_migration),
    ]
