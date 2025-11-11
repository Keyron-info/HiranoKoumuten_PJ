# ==========================================
# Phase 2: テストデータ作成コマンド
# ==========================================
# backend/invoices/management/commands/create_phase2_test_data.py

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import datetime, timedelta
from invoices.models import (
    Company, User, InvoiceTemplate, TemplateField,
    MonthlyInvoicePeriod, CustomField
)


class Command(BaseCommand):
    help = 'Phase 2のテストデータを作成'

    def handle(self, *args, **options):
        self.stdout.write('Phase 2テストデータ作成開始...\n')
        
        # 平野工務店を取得
        try:
            hirano = Company.objects.get(name='株式会社平野工務店')
        except Company.DoesNotExist:
            self.stdout.write(self.style.ERROR('平野工務店が見つかりません'))
            return
        
        # ==========================================
        # 1. 請求書テンプレート作成
        # ==========================================
        self.stdout.write('\n=== テンプレート作成 ===')
        
        # デフォルトテンプレート
        default_template, created = InvoiceTemplate.objects.get_or_create(
            company=hirano,
            name='標準テンプレート',
            defaults={
                'description': '全業種共通の標準テンプレート',
                'is_active': True,
                'is_default': True
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f'✅ {default_template.name}'))
        
        # 電気工事用テンプレート
        electric_template, created = InvoiceTemplate.objects.get_or_create(
            company=hirano,
            name='電気工事用テンプレート',
            defaults={
                'description': '電気工事業者向けのテンプレート',
                'is_active': True,
                'is_default': False
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f'✅ {electric_template.name}'))
            
            # フィールド追加
            TemplateField.objects.create(
                template=electric_template,
                field_name='工事完了日',
                field_type='date',
                is_required=True,
                display_order=1,
                help_text='電気工事の完了日を入力してください'
            )
            TemplateField.objects.create(
                template=electric_template,
                field_name='使用資材',
                field_type='textarea',
                is_required=False,
                display_order=2,
                help_text='使用した主要資材を記載してください'
            )
        
        # 設備工事用テンプレート
        equipment_template, created = InvoiceTemplate.objects.get_or_create(
            company=hirano,
            name='設備工事用テンプレート',
            defaults={
                'description': '設備工事業者向けのテンプレート',
                'is_active': True,
                'is_default': False
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f'✅ {equipment_template.name}'))
        
        # ==========================================
        # 2. 月次請求期間作成
        # ==========================================
        self.stdout.write('\n=== 月次請求期間作成 ===')
        
        now = timezone.now()
        
        # 当月の期間（受付中）
        current_period, created = MonthlyInvoicePeriod.objects.get_or_create(
            company=hirano,
            year=now.year,
            month=now.month,
            defaults={
                'deadline_date': datetime(now.year, now.month, 25).date(),
                'is_closed': False,
                'notes': '当月分の請求書受付期間'
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS(
                f'✅ {current_period.period_name} (締切: {current_period.deadline_date})'
            ))
        
        # 先月の期間（締め済み）
        last_month = now.replace(day=1) - timedelta(days=1)
        last_period, created = MonthlyInvoicePeriod.objects.get_or_create(
            company=hirano,
            year=last_month.year,
            month=last_month.month,
            defaults={
                'deadline_date': datetime(last_month.year, last_month.month, 25).date(),
                'is_closed': True,
                'closed_at': datetime(last_month.year, last_month.month, 26).replace(
                    hour=9, minute=0, second=0
                ),
                'notes': '先月分（締め済み）'
            }
        )
        if created:
            # 締め実行者を経理に設定
            try:
                keiri = User.objects.get(username='keiri_test')
                last_period.closed_by = keiri
                last_period.save()
            except User.DoesNotExist:
                pass
            
            self.stdout.write(self.style.SUCCESS(
                f'✅ {last_period.period_name} (締め済み)'
            ))
        
        # 来月の期間（事前作成）
        next_month_date = now.replace(day=1) + timedelta(days=32)
        next_month = next_month_date.replace(day=1)
        next_period, created = MonthlyInvoicePeriod.objects.get_or_create(
            company=hirano,
            year=next_month.year,
            month=next_month.month,
            defaults={
                'deadline_date': datetime(next_month.year, next_month.month, 25).date(),
                'is_closed': False,
                'notes': '来月分（事前作成）'
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS(
                f'✅ {next_period.period_name} (受付中)'
            ))
        
        # ==========================================
        # 3. カスタムフィールド作成
        # ==========================================
        self.stdout.write('\n=== カスタムフィールド作成 ===')
        
        custom_fields = [
            {
                'field_name': '緊急度',
                'field_type': 'select',
                'is_required': False,
                'display_order': 1,
                'help_text': '支払いの緊急度を選択してください'
            },
            {
                'field_name': '作業責任者',
                'field_type': 'text',
                'is_required': False,
                'display_order': 2,
                'help_text': '現場での作業責任者名'
            },
        ]
        
        for field_data in custom_fields:
            field, created = CustomField.objects.get_or_create(
                company=hirano,
                field_name=field_data['field_name'],
                defaults=field_data
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f'✅ {field.field_name}'))
        
        # ==========================================
        # 完了メッセージ
        # ==========================================
        self.stdout.write('\n' + '='*50)
        self.stdout.write(self.style.SUCCESS('✅ Phase 2テストデータ作成完了！'))
        self.stdout.write('='*50 + '\n')
        
        self.stdout.write('作成されたデータ:')
        self.stdout.write(f'  📋 テンプレート: {InvoiceTemplate.objects.filter(company=hirano).count()}件')
        self.stdout.write(f'  📅 請求期間: {MonthlyInvoicePeriod.objects.filter(company=hirano).count()}件')
        self.stdout.write(f'  ⚙️  カスタムフィールド: {CustomField.objects.filter(company=hirano).count()}件')
        
        self.stdout.write('\n次のステップ:')
        self.stdout.write('  1. Django管理画面でデータを確認')
        self.stdout.write('  2. フロントエンドでテンプレート選択機能をテスト')
        self.stdout.write('  3. 月次締め処理をテスト')