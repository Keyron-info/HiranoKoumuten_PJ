from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('invoices', '0025_clear_invoice_data_once'),
    ]

    operations = [
        migrations.AddField(
            model_name='userregistrationrequest',
            name='bank_name',
            field=models.CharField(blank=True, max_length=100, verbose_name='銀行名'),
        ),
        migrations.AddField(
            model_name='userregistrationrequest',
            name='bank_branch',
            field=models.CharField(blank=True, max_length=100, verbose_name='支店名'),
        ),
        migrations.AddField(
            model_name='userregistrationrequest',
            name='bank_account_type',
            field=models.CharField(
                blank=True,
                choices=[('ordinary', '普通'), ('current', '当座')],
                default='ordinary',
                max_length=10,
                verbose_name='口座種別',
            ),
        ),
        migrations.AddField(
            model_name='userregistrationrequest',
            name='bank_account_number',
            field=models.CharField(blank=True, max_length=20, verbose_name='口座番号'),
        ),
        migrations.AddField(
            model_name='userregistrationrequest',
            name='bank_account_holder',
            field=models.CharField(blank=True, max_length=100, verbose_name='口座名義'),
        ),
    ]
