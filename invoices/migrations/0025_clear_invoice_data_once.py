"""
一回限りのデータクリーンアップ。
請求書関連の全トランザクションデータを削除し、DBをクリーンな状態にする。
ユーザー・会社・現場・マスターデータは保持する。
"""
from django.db import migrations, transaction


def clear_invoice_data(apps, schema_editor):
    models_to_delete = [
        'InvoiceItem',
        'InvoiceCorrection',
        'InvoiceComment',
        'ApprovalHistory',
        'InvoiceChangeHistory',
        'FileAttachment',
        'InvoiceApprovalStep',
        'InvoiceApprovalWorkflow',
        'PurchaseOrderItem',
        'PurchaseOrder',
        'Invoice',
        'AuditLog',
        'AccessLog',
        'SystemNotification',
        'BatchApprovalSchedule',
        'ConstructionTypeUsage',
        'UserRegistrationRequest',
    ]

    total = 0
    for model_name in models_to_delete:
        try:
            Model = apps.get_model('invoices', model_name)
            deleted, _ = Model.objects.all().delete()
            total += deleted
            print(f'[migration 0025] {model_name}: {deleted} 件削除')
        except LookupError:
            print(f'[migration 0025] {model_name}: モデルが見つからないためスキップ')
        except Exception as e:
            print(f'[migration 0025] {model_name}: エラー ({e}) スキップ')

    # MonthlyInvoicePeriod は削除せず締め状態だけリセット
    try:
        MonthlyInvoicePeriod = apps.get_model('invoices', 'MonthlyInvoicePeriod')
        reset = MonthlyInvoicePeriod.objects.update(
            is_closed=False,
            closed_by_id=None,
            closed_at=None,
        )
        print(f'[migration 0025] MonthlyInvoicePeriod リセット: {reset} 件')
    except Exception as e:
        print(f'[migration 0025] MonthlyInvoicePeriod リセットエラー: {e}')

    print(f'[migration 0025] 完了: 合計 {total} 件削除')


def reverse_migration(apps, schema_editor):
    pass  # 元に戻す操作なし


class Migration(migrations.Migration):

    dependencies = [
        ('invoices', '0024_fix_internal_users_null_company'),
    ]

    operations = [
        migrations.RunPython(
            clear_invoice_data,
            reverse_migration,
        ),
    ]
