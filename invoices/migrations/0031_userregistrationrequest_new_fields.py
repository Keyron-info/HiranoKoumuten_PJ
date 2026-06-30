"""
UserRegistrationRequest に新規フィールドを追加:
  - invoice_email（請求書送付先メール）
  - branch_office_address（営業所住所）
  - contact_department / contact_position / contact_person / accounting_contact（担当者情報）
  - main_construction_type（メイン工種）
  - bank_account_holder_kana（口座名義フリガナ）
  - full_name / address を blank=True に変更
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('invoices', '0030_allow_any_internal_as_supervisor'),
    ]

    operations = [
        # existing fields: make blank
        migrations.AlterField(
            model_name='userregistrationrequest',
            name='full_name',
            field=models.CharField(blank=True, max_length=100, verbose_name='氏名'),
        ),
        migrations.AlterField(
            model_name='userregistrationrequest',
            name='address',
            field=models.TextField(blank=True, verbose_name='住所'),
        ),
        # new fields
        migrations.AddField(
            model_name='userregistrationrequest',
            name='invoice_email',
            field=models.EmailField(blank=True, max_length=254, verbose_name='請求書等送付先メールアドレス'),
        ),
        migrations.AddField(
            model_name='userregistrationrequest',
            name='branch_office_address',
            field=models.TextField(blank=True, verbose_name='営業所の住所'),
        ),
        migrations.AddField(
            model_name='userregistrationrequest',
            name='contact_department',
            field=models.CharField(blank=True, max_length=100, verbose_name='担当部署名'),
        ),
        migrations.AddField(
            model_name='userregistrationrequest',
            name='contact_position',
            field=models.CharField(blank=True, max_length=100, verbose_name='担当役職名'),
        ),
        migrations.AddField(
            model_name='userregistrationrequest',
            name='contact_person',
            field=models.CharField(blank=True, max_length=100, verbose_name='担当者'),
        ),
        migrations.AddField(
            model_name='userregistrationrequest',
            name='accounting_contact',
            field=models.CharField(blank=True, max_length=100, verbose_name='経理担当者'),
        ),
        migrations.AddField(
            model_name='userregistrationrequest',
            name='main_construction_type',
            field=models.CharField(blank=True, max_length=50, verbose_name='メイン工種'),
        ),
        migrations.AddField(
            model_name='userregistrationrequest',
            name='bank_account_holder_kana',
            field=models.CharField(blank=True, max_length=100, verbose_name='口座名義フリガナ'),
        ),
    ]
