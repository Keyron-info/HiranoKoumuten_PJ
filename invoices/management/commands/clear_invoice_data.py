"""
請求書関連の全トランザクションデータを削除する。
ユーザー・会社・現場・マスターデータは保持する。
"""
from django.core.management.base import BaseCommand
from django.db import transaction


class Command(BaseCommand):
    help = '請求書関連データを全削除（ユーザー・マスターは保持）'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='件数確認のみ（実際には削除しない）',
        )
        parser.add_argument(
            '--yes',
            action='store_true',
            help='確認プロンプトをスキップ',
        )

    def handle(self, *args, **options):
        from invoices.models import (
            Invoice, InvoiceItem, ApprovalHistory, InvoiceComment,
            InvoiceCorrection, InvoiceChangeHistory, FileAttachment,
            InvoiceApprovalWorkflow, InvoiceApprovalStep,
            PurchaseOrder, PurchaseOrderItem,
            AuditLog, AccessLog, SystemNotification,
            BatchApprovalSchedule, ConstructionTypeUsage,
            UserRegistrationRequest, MonthlyInvoicePeriod,
        )

        dry_run = options['dry_run']

        # 削除対象と件数
        targets = [
            ('InvoiceItem',             InvoiceItem.objects.all()),
            ('InvoiceCorrection',       InvoiceCorrection.objects.all()),
            ('InvoiceComment',          InvoiceComment.objects.all()),
            ('ApprovalHistory',         ApprovalHistory.objects.all()),
            ('InvoiceChangeHistory',    InvoiceChangeHistory.objects.all()),
            ('FileAttachment',          FileAttachment.objects.all()),
            ('InvoiceApprovalStep',     InvoiceApprovalStep.objects.all()),
            ('InvoiceApprovalWorkflow', InvoiceApprovalWorkflow.objects.all()),
            ('PurchaseOrderItem',       PurchaseOrderItem.objects.all()),
            ('PurchaseOrder',           PurchaseOrder.objects.all()),
            ('Invoice',                 Invoice.objects.all()),
            ('AuditLog',                AuditLog.objects.all()),
            ('AccessLog',               AccessLog.objects.all()),
            ('SystemNotification',      SystemNotification.objects.all()),
            ('BatchApprovalSchedule',   BatchApprovalSchedule.objects.all()),
            ('ConstructionTypeUsage',   ConstructionTypeUsage.objects.all()),
            ('UserRegistrationRequest', UserRegistrationRequest.objects.all()),
        ]

        self.stdout.write('\n【削除対象】')
        total = 0
        for name, qs in targets:
            count = qs.count()
            total += count
            self.stdout.write(f'  {name}: {count} 件')

        # MonthlyInvoicePeriod は削除せずリセット
        period_count = MonthlyInvoicePeriod.objects.filter(is_closed=True).count()
        self.stdout.write(f'  MonthlyInvoicePeriod（締め解除のみ）: {period_count} 件')

        self.stdout.write(f'\n  合計: {total} 件削除 + {period_count} 件リセット')

        if dry_run:
            self.stdout.write(self.style.WARNING('\n[DRY RUN] --dry-run のため実際には削除しません'))
            return

        if not options['yes']:
            confirm = input('\n本当に削除しますか？ (yes/no): ')
            if confirm.strip().lower() != 'yes':
                self.stdout.write(self.style.WARNING('キャンセルしました'))
                return

        try:
            with transaction.atomic():
                for name, qs in targets:
                    deleted, _ = qs.delete()
                    self.stdout.write(self.style.SUCCESS(f'  ✅ {name}: {deleted} 件削除'))

                # MonthlyInvoicePeriod は締め状態をリセット（構造は残す）
                reset = MonthlyInvoicePeriod.objects.update(
                    is_closed=False,
                    closed_by=None,
                    closed_at=None,
                )
                self.stdout.write(self.style.SUCCESS(f'  ✅ MonthlyInvoicePeriod リセット: {reset} 件'))

            self.stdout.write('\n' + '=' * 60)
            self.stdout.write(self.style.SUCCESS('\n✅ 完了: 請求書データを全削除しました'))
            self.stdout.write('   ユーザー・会社・現場・マスターデータは保持されています')
            self.stdout.write('=' * 60 + '\n')

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'\n❌ エラーが発生しました: {e}'))
            raise
