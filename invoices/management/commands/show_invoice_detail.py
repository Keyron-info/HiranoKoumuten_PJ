from django.core.management.base import BaseCommand
from invoices.models import Invoice, ApprovalHistory

class Command(BaseCommand):
    help = '特定の請求書の詳細情報を表示'

    def add_arguments(self, parser):
        parser.add_argument('invoice_id', type=int, help='請求書ID')

    def handle(self, *args, **options):
        invoice_id = options['invoice_id']
        
        try:
            invoice = Invoice.objects.get(id=invoice_id)
        except Invoice.DoesNotExist:
            self.stdout.write(self.style.ERROR(f"請求書ID {invoice_id} が見つかりません"))
            return
        
        self.stdout.write("=" * 70)
        self.stdout.write(f"請求書詳細情報 (ID: {invoice.id})")
        self.stdout.write("=" * 70)
        
        # 基本情報
        self.stdout.write(f"\n【基本情報】")
        self.stdout.write(f"  請求書番号: {invoice.invoice_number}")
        self.stdout.write(f"  ステータス: {invoice.get_status_display()} ({invoice.status})")
        self.stdout.write(f"  作成日: {invoice.created_at}")
        self.stdout.write(f"  作成者: {invoice.created_by.username if invoice.created_by else 'なし'}")
        
        # 会社・現場情報
        self.stdout.write(f"\n【会社・現場情報】")
        self.stdout.write(f"  協力会社: {invoice.customer_company.name if invoice.customer_company else 'なし'}")
        self.stdout.write(f"  受取企業: {invoice.receiving_company.name if invoice.receiving_company else 'なし'}")
        self.stdout.write(f"  工事現場: {invoice.construction_site.name if invoice.construction_site else 'なし'}")
        if invoice.construction_site:
            self.stdout.write(f"  現場監督: {invoice.construction_site.supervisor.username if invoice.construction_site.supervisor else 'なし'}")
        
        # 承認情報
        self.stdout.write(f"\n【承認情報】")
        self.stdout.write(f"  承認ルートID: {invoice.approval_route_id if invoice.approval_route else 'なし'}")
        if invoice.approval_route:
            self.stdout.write(f"  承認ルート名: {invoice.approval_route.name}")
            steps = invoice.approval_route.steps.all().order_by('step_order')
            self.stdout.write(f"  承認ステップ数: {steps.count()}件")
            for step in steps:
                self.stdout.write(f"    - Step {step.step_order}: {step.step_name} ({step.approver_position})")
                if step.approver_user:
                    self.stdout.write(f"      担当者: {step.approver_user.username}")
        
        self.stdout.write(f"  現在の承認ステップID: {invoice.current_approval_step_id if invoice.current_approval_step else 'なし'}")
        if invoice.current_approval_step:
            self.stdout.write(f"  現在の承認ステップ: {invoice.current_approval_step.step_name} (Order: {invoice.current_approval_step.step_order})")
        
        self.stdout.write(f"  現在の承認者ID: {invoice.current_approver_id if invoice.current_approver else 'なし'}")
        if invoice.current_approver:
            self.stdout.write(f"  現在の承認者: {invoice.current_approver.username} ({invoice.current_approver.get_position_display()})")
        
        # 承認履歴
        self.stdout.write(f"\n【承認履歴】")
        histories = ApprovalHistory.objects.filter(invoice=invoice).order_by('created_at')
        if histories.exists():
            self.stdout.write(f"  承認履歴数: {histories.count()}件")
            for history in histories:
                self.stdout.write(f"    - {history.created_at.strftime('%Y-%m-%d %H:%M')}: {history.get_action_display()} by {history.user.username if history.user else 'System'}")
                if history.comment:
                    self.stdout.write(f"      コメント: {history.comment}")
                if history.approval_step:
                    self.stdout.write(f"      ステップ: {history.approval_step.step_name}")
        else:
            self.stdout.write(f"  承認履歴: なし")
        
        # 金額情報
        self.stdout.write(f"\n【金額情報】")
        self.stdout.write(f"  合計金額: ¥{invoice.total_amount:,}")
        
        self.stdout.write("\n" + "=" * 70)
