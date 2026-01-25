# invoices/services.py
"""
KEYRON BIM - サービス層
追加機能の実装: メール通知、監査ログ、CSV出力、PDF生成など
"""

import csv
import io
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Optional, List, Dict, Any

from django.conf import settings
from django.core.mail import send_mail, EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils import timezone
from django.db.models import Sum, Count, Q, F
from django.http import HttpResponse

from .models import (
    Invoice, InvoiceItem, User, CustomerCompany, ConstructionSite,
    SystemNotification, AccessLog, MonthlyInvoicePeriod, SafetyFee,
    InvoiceChangeHistory, ApprovalHistory, InvoiceCorrection
)


# ====================
# メール通知サービス
# ====================

class EmailService:
    """メール通知サービス"""
    
    @staticmethod
    def send_notification(
        recipient: User,
        subject: str,
        message: str,
        html_message: Optional[str] = None,
        related_invoice: Optional[Invoice] = None
    ) -> bool:
        """通知メールを送信"""
        try:
            if html_message:
                email = EmailMultiAlternatives(
                    subject=f"{settings.EMAIL_SUBJECT_PREFIX}{subject}",
                    body=message,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    to=[recipient.email]
                )
                email.attach_alternative(html_message, "text/html")
                email.send()
            else:
                send_mail(
                    subject=f"{settings.EMAIL_SUBJECT_PREFIX}{subject}",
                    message=message,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[recipient.email],
                    fail_silently=False
                )
            
            # システム通知も作成
            SystemNotification.objects.create(
                recipient=recipient,
                notification_type='info',
                title=subject,
                message=message,
                related_invoice=related_invoice,
                action_url=f'/invoices/{related_invoice.id}' if related_invoice else ''
            )
            
            return True
        except Exception as e:
            print(f"メール送信エラー: {e}")
            return False
    
    @classmethod
    def send_submission_notification(cls, invoice: Invoice):
        """請求書提出通知"""
        if not invoice.construction_site or not invoice.construction_site.supervisor:
            return False
        
        supervisor = invoice.construction_site.supervisor
        subject = f"【請求書承認依頼】{invoice.invoice_number}"
        message = f"""
{supervisor.get_full_name()} 様

請求書の承認依頼が届いています。

請求書番号: {invoice.invoice_number}
協力会社: {invoice.customer_company.name}
工事現場: {invoice.construction_site.name}
金額: ¥{invoice.total_amount:,}

システムにログインして確認してください。
        """.strip()
        
        return cls.send_notification(supervisor, subject, message, related_invoice=invoice)
    
    @classmethod
    def send_approval_notification(cls, invoice: Invoice, approver: User, action: str):
        """承認/却下/差し戻し通知"""
        # 協力会社ユーザーに通知
        partner_users = User.objects.filter(
            customer_company=invoice.customer_company,
            is_active=True
        )
        
        action_display = {
            'approved': '承認されました',
            'rejected': '却下されました',
            'returned': '差し戻しされました'
        }.get(action, action)
        
        subject = f"【請求書{action_display}】{invoice.invoice_number}"
        
        for user in partner_users:
            message = f"""
{user.get_full_name()} 様

請求書が{action_display}。

請求書番号: {invoice.invoice_number}
工事現場: {invoice.construction_site.name if invoice.construction_site else '-'}
金額: ¥{invoice.total_amount:,}
承認者: {approver.get_full_name()}

システムにログインして詳細を確認してください。
            """.strip()
            
            cls.send_notification(user, subject, message, related_invoice=invoice)
    
    @classmethod
    def send_correction_notification(cls, invoice: Invoice, correction: InvoiceCorrection):
        """赤ペン修正通知"""
        partner_users = User.objects.filter(
            customer_company=invoice.customer_company,
            is_active=True
        )
        
        subject = f"【修正通知】{invoice.invoice_number}"
        
        for user in partner_users:
            message = f"""
{user.get_full_name()} 様

請求書に修正が入りました。内容を確認して承認してください。

請求書番号: {invoice.invoice_number}
修正内容:
  フィールド: {correction.field_name}
  変更前: {correction.original_value}
  変更後: {correction.corrected_value}
  理由: {correction.correction_reason}

システムにログインして承認してください。
            """.strip()
            
            cls.send_notification(user, subject, message, related_invoice=invoice)
    
    @classmethod
    def send_deadline_reminder(cls, invoice: Invoice, days_remaining: int):
        """期限リマインダー"""
        if not invoice.current_approver:
            return False
        
        subject = f"【リマインド】請求書承認期限まであと{days_remaining}日"
        message = f"""
{invoice.current_approver.get_full_name()} 様

以下の請求書の承認期限が近づいています。

請求書番号: {invoice.invoice_number}
協力会社: {invoice.customer_company.name}
金額: ¥{invoice.total_amount:,}
残り日数: {days_remaining}日

お早めにご確認ください。
        """.strip()
        
        return cls.send_notification(
            invoice.current_approver, subject, message, related_invoice=invoice
        )
    
    @classmethod
    def send_safety_fee_notification(cls, invoice: Invoice, fee_amount: Decimal):
        """安全衛生協力会費通知"""
        partner_users = User.objects.filter(
            customer_company=invoice.customer_company,
            is_active=True
        )
        
        net_amount = invoice.total_amount - fee_amount
        subject = f"【安全衛生協力会費のお知らせ】{invoice.invoice_number}"
        
        for user in partner_users:
            message = f"""
{user.get_full_name()} 様

請求書 {invoice.invoice_number} に対する安全衛生協力会費のお知らせです。

請求金額: ¥{invoice.total_amount:,}
協力会費 (3/1000): ¥{fee_amount:,}
差引支払額: ¥{net_amount:,}

この金額がお支払いから控除されます。
            """.strip()
            
            cls.send_notification(user, subject, message, related_invoice=invoice)
        
        # 通知済みフラグを更新
        invoice.safety_fee_notified = True
        invoice.save(update_fields=['safety_fee_notified'])


# ====================
# 監査ログサービス
# ====================

class AuditLogService:
    """監査ログサービス"""
    
    @staticmethod
    def log(
        user: User,
        action: str,
        resource_type: str,
        resource_id: str = '',
        ip_address: str = None,
        user_agent: str = '',
        details: Dict = None
    ):
        """監査ログを記録"""
        return AccessLog.objects.create(
            user=user,
            action=action,
            resource_type=resource_type,
            resource_id=str(resource_id),
            ip_address=ip_address,
            user_agent=user_agent,
            details=details or {}
        )
    
    @staticmethod
    def get_client_info(request) -> Dict:
        """リクエストからクライアント情報を取得"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        
        return {
            'ip_address': ip,
            'user_agent': request.META.get('HTTP_USER_AGENT', '')
        }
    
    @classmethod
    def log_invoice_action(cls, request, invoice: Invoice, action: str, details: Dict = None):
        """請求書関連のアクションをログ"""
        client_info = cls.get_client_info(request)
        return cls.log(
            user=request.user,
            action=action,
            resource_type='invoice',
            resource_id=invoice.id,
            ip_address=client_info['ip_address'],
            user_agent=client_info['user_agent'],
            details={
                'invoice_number': invoice.invoice_number,
                'total_amount': str(invoice.total_amount),
                **(details or {})
            }
        )


# ====================
# CSV出力サービス
# ====================

class CSVExportService:
    """CSV出力サービス"""
    
    @staticmethod
    def _safe_str(value, default=''):
        """安全に文字列変換"""
        if value is None:
            return default
        return str(value)
    
    @staticmethod
    def _safe_number(value, default=0):
        """安全に数値変換"""
        if value is None:
            return default
        try:
            return int(value)
        except (ValueError, TypeError):
            return default
    
    @staticmethod
    def export_invoices(
        queryset,
        filename: str = 'invoices.csv'
    ) -> HttpResponse:
        """請求書一覧をCSV出力"""
        response = HttpResponse(content_type='text/csv; charset=utf-8-sig')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        
        writer = csv.writer(response)
        
        # ヘッダー
        writer.writerow([
            '請求書番号', '協力会社', '工事現場', '工種', '請求日',
            '小計', '消費税', '合計金額', '協力会費', '差引支払額',
            'ステータス', '作成日', '作成者'
        ])
        
        # データ
        for invoice in queryset:
            try:
                total = CSVExportService._safe_number(invoice.total_amount)
                safety_fee = CSVExportService._safe_number(
                    getattr(invoice, 'safety_cooperation_fee', 0)
                )
                net_amount = total - safety_fee
                
                # 関連オブジェクトの安全な取得
                company_name = ''
                if invoice.customer_company:
                    company_name = getattr(invoice.customer_company, 'name', '')
                
                site_name = ''
                if invoice.construction_site:
                    site_name = getattr(invoice.construction_site, 'name', '')
                
                type_name = ''
                if hasattr(invoice, 'construction_type') and invoice.construction_type:
                    type_name = getattr(invoice.construction_type, 'name', '')
                
                creator_name = ''
                if invoice.created_by:
                    creator_name = invoice.created_by.get_full_name() or ''
                
                writer.writerow([
                    CSVExportService._safe_str(invoice.invoice_number),
                    company_name,
                    site_name,
                    type_name,
                    invoice.invoice_date.strftime('%Y/%m/%d') if invoice.invoice_date else '',
                    CSVExportService._safe_number(invoice.subtotal),
                    CSVExportService._safe_number(invoice.tax_amount),
                    total,
                    safety_fee,
                    net_amount,
                    invoice.get_status_display() if hasattr(invoice, 'get_status_display') else '',
                    invoice.created_at.strftime('%Y/%m/%d %H:%M') if invoice.created_at else '',
                    creator_name
                ])
            except Exception as e:
                # エラーが発生した行はスキップするか、エラー情報を記録
                print(f"CSV行出力エラー (Invoice {getattr(invoice, 'id', 'unknown')}): {e}")
                continue
        
        return response
    
    @staticmethod
    def export_monthly_summary(year: int, month: int = None) -> HttpResponse:
        """月別集計をCSV出力"""
        filename = f'monthly_summary_{year}'
        if month:
            filename += f'_{month:02d}'
        filename += '.csv'
        
        response = HttpResponse(content_type='text/csv; charset=utf-8-sig')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        
        writer = csv.writer(response)
        
        # ヘッダー
        writer.writerow([
            '年月', '協力会社', '工事現場', '件数', '小計', '消費税',
            '合計金額', '協力会費', '差引支払額'
        ])
        
        # クエリ
        invoices = Invoice.objects.filter(
            status__in=['approved', 'paid', 'payment_preparing']
        )
        
        if month:
            invoices = invoices.filter(
                invoice_date__year=year,
                invoice_date__month=month
            )
        else:
            invoices = invoices.filter(invoice_date__year=year)
        
        # 集計
        summary = invoices.values(
            'customer_company__name',
            'construction_site__name'
        ).annotate(
            count=Count('id'),
            subtotal_sum=Sum('subtotal'),
            tax_sum=Sum('tax_amount'),
            total_sum=Sum('total_amount'),
            fee_sum=Sum('safety_cooperation_fee')
        ).order_by('customer_company__name', 'construction_site__name')
        
        for row in summary:
            net_amount = (row['total_sum'] or 0) - (row['fee_sum'] or 0)
            year_month = f'{year}年{month}月' if month else f'{year}年'
            writer.writerow([
                year_month,
                row['customer_company__name'] or '',
                row['construction_site__name'] or '',
                row['count'],
                row['subtotal_sum'] or 0,
                row['tax_sum'] or 0,
                row['total_sum'] or 0,
                row['fee_sum'] or 0,
                net_amount
            ])
        
        return response
    
    @staticmethod
    def export_company_summary(year: int, month: int = None) -> HttpResponse:
        """業者別集計をCSV出力"""
        filename = f'company_summary_{year}'
        if month:
            filename += f'_{month:02d}'
        filename += '.csv'
        
        response = HttpResponse(content_type='text/csv; charset=utf-8-sig')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        
        writer = csv.writer(response)
        
        # ヘッダー
        writer.writerow([
            '協力会社', '業種', '件数', '合計金額', '協力会費', '差引支払額'
        ])
        
        # クエリ
        invoices = Invoice.objects.filter(
            status__in=['approved', 'paid', 'payment_preparing']
        )
        
        if month:
            invoices = invoices.filter(
                invoice_date__year=year,
                invoice_date__month=month
            )
        else:
            invoices = invoices.filter(invoice_date__year=year)
        
        # 集計
        summary = invoices.values(
            'customer_company__name',
            'customer_company__business_type'
        ).annotate(
            count=Count('id'),
            total_sum=Sum('total_amount'),
            fee_sum=Sum('safety_cooperation_fee')
        ).order_by('customer_company__name')
        
        business_type_display = dict(CustomerCompany.BUSINESS_TYPE_CHOICES)
        
        for row in summary:
            net_amount = (row['total_sum'] or 0) - (row['fee_sum'] or 0)
            writer.writerow([
                row['customer_company__name'] or '',
                business_type_display.get(row['customer_company__business_type'], ''),
                row['count'],
                row['total_sum'] or 0,
                row['fee_sum'] or 0,
                net_amount
            ])
        
        return response
    
    @staticmethod
    def export_site_summary(year: int, month: int = None) -> HttpResponse:
        """現場別集計をCSV出力"""
        filename = f'site_summary_{year}'
        if month:
            filename += f'_{month:02d}'
        filename += '.csv'
        
        response = HttpResponse(content_type='text/csv; charset=utf-8-sig')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        
        writer = csv.writer(response)
        
        # ヘッダー
        writer.writerow([
            '工事現場', '予算', '件数', '合計金額', '消化率(%)', 
            '残予算', 'ステータス'
        ])
        
        # クエリ
        invoices = Invoice.objects.filter(
            status__in=['approved', 'paid', 'payment_preparing']
        )
        
        if month:
            invoices = invoices.filter(
                invoice_date__year=year,
                invoice_date__month=month
            )
        else:
            invoices = invoices.filter(invoice_date__year=year)
        
        # 集計
        summary = invoices.values(
            'construction_site__id',
            'construction_site__name',
            'construction_site__total_budget'
        ).annotate(
            count=Count('id'),
            total_sum=Sum('total_amount')
        ).order_by('construction_site__name')
        
        for row in summary:
            budget = row['construction_site__total_budget'] or 0
            total = row['total_sum'] or 0
            rate = round((total / budget * 100), 1) if budget > 0 else 0
            remaining = budget - total
            
            status = '正常'
            if rate >= 100:
                status = '予算超過'
            elif rate >= 90:
                status = '要注意'
            elif rate >= 80:
                status = '80%到達'
            
            writer.writerow([
                row['construction_site__name'] or '',
                budget,
                row['count'],
                total,
                rate,
                remaining,
                status
            ])
        
        return response
    
    @staticmethod
    def export_audit_logs(
        start_date: datetime = None,
        end_date: datetime = None,
        user_id: int = None
    ) -> HttpResponse:
        """監査ログをCSV出力"""
        filename = f'audit_logs_{timezone.now().strftime("%Y%m%d")}.csv'
        
        response = HttpResponse(content_type='text/csv; charset=utf-8-sig')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        
        writer = csv.writer(response)
        
        # ヘッダー
        writer.writerow([
            '日時', 'ユーザー', 'アクション', 'リソース種別',
            'リソースID', 'IPアドレス', '詳細'
        ])
        
        # クエリ
        logs = AccessLog.objects.select_related('user').all()
        
        if start_date:
            logs = logs.filter(timestamp__gte=start_date)
        if end_date:
            logs = logs.filter(timestamp__lte=end_date)
        if user_id:
            logs = logs.filter(user_id=user_id)
        
        logs = logs.order_by('-timestamp')[:10000]  # 最大10000件
        
        for log in logs:
            writer.writerow([
                log.timestamp.strftime('%Y/%m/%d %H:%M:%S'),
                log.user.get_full_name(),
                log.get_action_display(),
                log.resource_type,
                log.resource_id,
                log.ip_address or '',
                str(log.details)
            ])
        
        return response


# ====================
# 月次締め処理サービス
# ====================

class MonthlyClosingService:
    """月次締め処理サービス"""
    
    @staticmethod
    def can_submit_invoice(invoice: Invoice) -> tuple[bool, str]:
        """請求書が提出可能かチェック"""
        invoice_settings = getattr(settings, 'INVOICE_SETTINGS', {})
        deadline_day = invoice_settings.get('MONTHLY_DEADLINE_DAY', 25)
        
        today = timezone.now().date()
        
        # 請求日が設定されている場合
        if invoice.invoice_date:
            invoice_month = invoice.invoice_date.month
            invoice_year = invoice.invoice_date.year
            
            # 現在の月と異なる場合
            if (invoice_year, invoice_month) != (today.year, today.month):
                # 前月の請求書で、翌月1日以降の場合
                if today.day >= 1:
                    # 前月の場合は提出不可
                    last_month = today.replace(day=1) - timedelta(days=1)
                    if (invoice_year, invoice_month) == (last_month.year, last_month.month):
                        return False, f"前月分の請求書は翌月1日以降は提出できません"
        
        # 期間が設定されている場合
        if invoice.invoice_period:
            if invoice.invoice_period.is_closed:
                return False, f"{invoice.invoice_period.period_name}は締め済みです"
            if invoice.invoice_period.is_past_deadline:
                return False, f"{invoice.invoice_period.period_name}の締切（{invoice.invoice_period.deadline_date}）を過ぎています"
        
        return True, ""
    
    @staticmethod
    def check_correction_allowed(invoice: Invoice) -> tuple[bool, str]:
        """訂正可能かチェック"""
        if not invoice.received_at:
            return True, ""
        
        if invoice.correction_deadline:
            if timezone.now() > invoice.correction_deadline:
                return False, f"訂正期限（{invoice.correction_deadline.strftime('%Y/%m/%d %H:%M')}）を過ぎています"
        
        return True, ""
    
    @staticmethod
    def get_current_period(company) -> Optional[MonthlyInvoicePeriod]:
        """現在の請求期間を取得"""
        today = timezone.now().date()
        return MonthlyInvoicePeriod.objects.filter(
            company=company,
            year=today.year,
            month=today.month,
            is_closed=False
        ).first()
    
    @staticmethod
    def close_period(period: MonthlyInvoicePeriod, user: User) -> tuple[bool, str]:
        """期間を締める"""
        if period.is_closed:
            return False, "既に締め済みです"
        
        period.close_period(user)
        return True, f"{period.period_name}を締めました"


# ====================
# 安全衛生協力会費サービス
# ====================

class SafetyFeeService:
    """安全衛生協力会費サービス"""
    
    @staticmethod
    def calculate_fee(amount: Decimal) -> Decimal:
        """協力会費を計算"""
        invoice_settings = getattr(settings, 'INVOICE_SETTINGS', {})
        threshold = invoice_settings.get('SAFETY_FEE_THRESHOLD', 100000)
        rate = Decimal(str(invoice_settings.get('SAFETY_FEE_RATE', 0.003)))
        
        if amount >= threshold:
            return int(amount * rate)
        return Decimal('0')
    
    @classmethod
    def update_invoice_fee(cls, invoice: Invoice):
        """請求書の協力会費を更新"""
        fee = cls.calculate_fee(invoice.total_amount)
        invoice.safety_cooperation_fee = fee
        invoice.save(update_fields=['safety_cooperation_fee'])
        
        # SafetyFeeレコードも作成/更新
        safety_fee, created = SafetyFee.objects.update_or_create(
            invoice=invoice,
            defaults={
                'base_amount': invoice.total_amount,
                'fee_amount': fee
            }
        )
        
        return fee
    
    @classmethod
    def notify_fee(cls, invoice: Invoice) -> bool:
        """協力会費を通知"""
        if invoice.safety_fee_notified:
            return False
        
        if invoice.safety_cooperation_fee <= 0:
            return False
        
        EmailService.send_safety_fee_notification(
            invoice, invoice.safety_cooperation_fee
        )
        return True


# ====================
# 予算アラートサービス
# ====================

class BudgetAlertService:
    """予算アラートサービス"""
    
    @staticmethod
    def check_budget_alerts(site: ConstructionSite) -> List[Dict]:
        """予算アラートをチェック"""
        alerts = []
        
        if site.total_budget <= 0:
            return alerts
        
        rate = site.get_budget_consumption_rate()
        
        if rate >= 100 and not site.budget_alert_100_notified:
            alerts.append({
                'threshold': 100,
                'rate': rate,
                'message': f'予算を超過しています（{rate}%）'
            })
        elif rate >= 90 and not site.budget_alert_90_notified:
            alerts.append({
                'threshold': 90,
                'rate': rate,
                'message': f'予算消化率が90%に到達しました（{rate}%）'
            })
        elif rate >= 80 and not site.budget_alert_80_notified:
            alerts.append({
                'threshold': 80,
                'rate': rate,
                'message': f'予算消化率が80%に到達しました（{rate}%）'
            })
        
        return alerts
    
    @classmethod
    def send_budget_alerts(cls, site: ConstructionSite):
        """予算アラートを送信"""
        alerts = site.check_and_send_budget_alerts()
        return alerts


# ====================
# 金額照合サービス
# ====================

class AmountVerificationService:
    """金額照合サービス"""
    
    @staticmethod
    def verify_invoice_amount(invoice: Invoice) -> Dict:
        """請求書金額を注文書と照合"""
        result = {
            'verified': False,
            'status': 'no_order',
            'difference': 0,
            'message': '注文書が紐付けられていません',
            'auto_approve': False
        }
        
        if not invoice.purchase_order:
            invoice.amount_check_result = 'no_order'
            invoice.save(update_fields=['amount_check_result'])
            return result
        
        order_amount = invoice.purchase_order.total_amount
        invoice_amount = invoice.total_amount
        difference = invoice_amount - order_amount
        
        if invoice_amount == order_amount:
            result = {
                'verified': True,
                'status': 'matched',
                'difference': 0,
                'message': '注文書金額と一致しています',
                'auto_approve': True
            }
            invoice.amount_check_result = 'matched'
            invoice.is_auto_approved = True
        elif invoice_amount > order_amount:
            result = {
                'verified': True,
                'status': 'over',
                'difference': difference,
                'message': f'注文書金額より¥{difference:,}上乗せされています',
                'auto_approve': False,
                'requires_additional_approval': True
            }
            invoice.amount_check_result = 'over'
        else:
            result = {
                'verified': True,
                'status': 'under',
                'difference': difference,
                'message': f'注文書金額より¥{abs(difference):,}減額されています',
                'auto_approve': False
            }
            invoice.amount_check_result = 'under'
        
        invoice.amount_difference = difference
        invoice.save(update_fields=['amount_check_result', 'amount_difference', 'is_auto_approved'])
        
        return result


# ====================
# 円グラフデータサービス
# ====================

class ChartDataService:
    """チャートデータサービス"""
    
    @staticmethod
    def get_site_payment_chart_data() -> Dict:
        """現場別支払い割合のチャートデータ"""
        sites = ConstructionSite.objects.filter(
            is_active=True
        ).annotate(
            total_invoiced=Sum(
                'invoice__total_amount',
                filter=Q(invoice__status__in=['approved', 'paid', 'payment_preparing'])
            )
        ).exclude(
            total_invoiced__isnull=True
        ).exclude(
            total_invoiced=0
        ).order_by('-total_invoiced')[:10]  # 上位10件
        
        data = []
        total = sum(s.total_invoiced or 0 for s in sites)
        
        for site in sites:
            amount = site.total_invoiced or 0
            percentage = round((amount / total * 100), 1) if total > 0 else 0
            
            # アラート状態を判定
            is_alert = False
            alert_reason = None
            
            if site.total_budget > 0:
                rate = (amount / site.total_budget * 100)
                if rate >= 100:
                    is_alert = True
                    alert_reason = '予算超過'
                elif rate >= 90:
                    is_alert = True
                    alert_reason = '予算90%到達'
            
            data.append({
                'site_id': site.id,
                'site_name': site.name,
                'amount': amount,
                'percentage': percentage,
                'budget': site.total_budget,
                'consumption_rate': site.get_budget_consumption_rate(),
                'is_alert': is_alert,
                'alert_reason': alert_reason
            })
        
        return {
            'total': total,
            'sites': data
        }
    
    @staticmethod
    def get_monthly_trend_data(year: int) -> List[Dict]:
        """月別推移データ"""
        data = []
        
        for month in range(1, 13):
            invoices = Invoice.objects.filter(
                invoice_date__year=year,
                invoice_date__month=month,
                status__in=['approved', 'paid', 'payment_preparing']
            ).aggregate(
                total=Sum('total_amount'),
                count=Count('id')
            )
            
            data.append({
                'month': month,
                'total_amount': invoices['total'] or 0,
                'invoice_count': invoices['count'] or 0
            })
        
        return data


# ====================
# 変更履歴サービス
# ====================

class ChangeHistoryService:
    """変更履歴サービス"""
    
    @staticmethod
    def record_change(
        invoice: Invoice,
        change_type: str,
        field_name: str,
        old_value: Any,
        new_value: Any,
        change_reason: str,
        changed_by: User
    ):
        """変更を記録"""
        return InvoiceChangeHistory.objects.create(
            invoice=invoice,
            change_type=change_type,
            field_name=field_name,
            old_value=str(old_value),
            new_value=str(new_value),
            change_reason=change_reason,
            changed_by=changed_by
        )
    
    @staticmethod
    def get_diff_display(old_value: str, new_value: str) -> Dict:
        """差分表示用のデータを生成"""
        return {
            'old_value': old_value,
            'new_value': new_value,
            'old_display': f'<span class="line-through text-red-500">{old_value}</span>',
            'new_display': f'<span class="text-green-600 font-bold">{new_value}</span>'
        }

