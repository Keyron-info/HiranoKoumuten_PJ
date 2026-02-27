# invoices/management/commands/auto_close_periods.py
"""
月次請求期間の自動締め処理
cronジョブとして毎日実行し、25日になったら自動的に当月分を締める。
翌月分の期間が存在しなければ自動作成する。

Usage:
    python manage.py auto_close_periods
    python manage.py auto_close_periods --dry-run
"""

import datetime
import calendar
from django.core.management.base import BaseCommand
from django.utils import timezone
from invoices.models import Company, MonthlyInvoicePeriod, User


class Command(BaseCommand):
    help = '月次請求期間の自動締め処理（毎日実行、25日に自動締め）'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='実際に変更を行わず、処理内容のみ表示',
        )
        parser.add_argument(
            '--deadline-day',
            type=int,
            default=25,
            help='締め日（デフォルト: 25日）',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        deadline_day = options['deadline_day']
        today = timezone.now().date()
        
        self.stdout.write(f"\n{'='*60}")
        self.stdout.write(f"月次自動締め処理 - {today.strftime('%Y年%m月%d日')}")
        self.stdout.write(f"{'='*60}")
        
        if dry_run:
            self.stdout.write(self.style.WARNING('ドライランモード: 変更は行いません'))

        companies = Company.objects.filter(is_active=True)
        
        if not companies.exists():
            self.stdout.write(self.style.WARNING('有効な会社が見つかりません'))
            return

        # システムユーザーを取得（自動処理の実行者）
        system_user = User.objects.filter(
            is_superuser=True, is_active=True
        ).first()
        
        if not system_user:
            system_user = User.objects.filter(
                position='admin', is_active=True
            ).first()

        for company in companies:
            self.stdout.write(f"\n--- {company.name} ---")
            
            # 1. 当月の期間を確認・自動作成
            current_period = self._ensure_period_exists(
                company, today.year, today.month, deadline_day, dry_run
            )
            
            # 2. 翌月の期間を確認・自動作成
            if today.month == 12:
                next_year, next_month = today.year + 1, 1
            else:
                next_year, next_month = today.year, today.month + 1
            
            self._ensure_period_exists(
                company, next_year, next_month, deadline_day, dry_run
            )
            
            # 3. 25日（またはそれ以降）なら当月分を自動締め
            if today.day >= deadline_day and current_period and not current_period.is_closed:
                self.stdout.write(
                    f"  締め処理: {current_period.period_name}"
                )
                
                if not dry_run:
                    current_period.is_closed = True
                    current_period.closed_at = timezone.now()
                    current_period.closed_by = system_user
                    current_period.notes = f'自動締め処理（{today.strftime("%Y/%m/%d")}実行）'
                    current_period.save()
                    self.stdout.write(self.style.SUCCESS(
                        f"  ✅ {current_period.period_name} を締めました"
                    ))
                else:
                    self.stdout.write(self.style.WARNING(
                        f"  [DRY] {current_period.period_name} を締め予定"
                    ))
            elif current_period and current_period.is_closed:
                self.stdout.write(f"  {current_period.period_name}: 締め済み")
            elif today.day < deadline_day:
                days_remaining = deadline_day - today.day
                self.stdout.write(
                    f"  {today.month}月分: 締め日まであと{days_remaining}日"
                )

        self.stdout.write(f"\n{'='*60}")
        self.stdout.write(self.style.SUCCESS('自動締め処理完了'))

    def _ensure_period_exists(self, company, year, month, deadline_day, dry_run):
        """期間が存在しなければ自動作成する"""
        period = MonthlyInvoicePeriod.objects.filter(
            company=company, year=year, month=month
        ).first()

        if period:
            return period

        # 期間の日付を計算
        # 対象期間: 前月26日〜当月25日
        if month == 1:
            prev_year, prev_month = year - 1, 12
        else:
            prev_year, prev_month = year, month - 1

        period_start = datetime.date(prev_year, prev_month, 26)
        period_end = datetime.date(year, month, deadline_day)
        
        # 提出期間: 当月26日〜翌月末日
        submission_start = datetime.date(year, month, 26)
        if month == 12:
            next_year, next_month = year + 1, 1
        else:
            next_year, next_month = year, month + 1
        last_day = calendar.monthrange(next_year, next_month)[1]
        submission_deadline = datetime.date(next_year, next_month, last_day)
        
        deadline_date = period_end

        self.stdout.write(f"  新規期間作成: {year}年{month}月分")
        self.stdout.write(f"    対象期間: {period_start} 〜 {period_end}")
        self.stdout.write(f"    提出期限: {submission_deadline}")

        if not dry_run:
            period = MonthlyInvoicePeriod.objects.create(
                company=company,
                year=year,
                month=month,
                period_start_date=period_start,
                period_end_date=period_end,
                submission_start_date=submission_start,
                submission_deadline=submission_deadline,
                deadline_date=deadline_date,
            )
            self.stdout.write(self.style.SUCCESS(
                f"  ✅ {year}年{month}月分を作成しました"
            ))
            return period
        else:
            self.stdout.write(self.style.WARNING(
                f"  [DRY] {year}年{month}月分を作成予定"
            ))
            return None
