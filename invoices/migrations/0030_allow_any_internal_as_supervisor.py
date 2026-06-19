"""
ConstructionSite.supervisor の limit_choices_to から position='site_supervisor' を除去。
社内ユーザー（user_type='internal'）であれば役職に関係なく担当者として設定可能にする。
"""
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('invoices', '0029_add_satoh_users'),
    ]

    operations = [
        migrations.AlterField(
            model_name='constructionsite',
            name='supervisor',
            field=models.ForeignKey(
                blank=True,
                limit_choices_to={'user_type': 'internal'},
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='supervised_sites',
                to=settings.AUTH_USER_MODEL,
                verbose_name='現場監督',
            ),
        ),
    ]
