from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from invoices.models import Invoice, ApprovalRoute, ApprovalStep

User = get_user_model()

class Command(BaseCommand):
    help = 'Fix stalled invoices by relinking to the active approval route'

    def handle(self, *args, **options):
        # 1. アクティブな承認ルートを取得
        active_route = ApprovalRoute.objects.filter(is_active=True).first()
        if not active_route:
            self.stdout.write(self.style.ERROR('❌ アクティブな承認ルートが見つかりません。setup_approval_routeを実行してください。'))
            return

        self.stdout.write(f'✅ アクティブな承認ルート: {active_route.name} (Steps: {active_route.steps.count()})')
        
        # ステップを順序通りに取得
        steps = list(active_route.steps.all().order_by('step_order'))
        if not steps:
            self.stdout.write(self.style.ERROR('❌ 承認ステップが定義されていません。'))
            return

        # 2. 承認待ちの請求書を取得
        pending_invoices = Invoice.objects.filter(status='pending_approval')
        self.stdout.write(f'📋 承認待ち請求書: {pending_invoices.count()}件')

        updates = 0
        for invoice in pending_invoices:
            # 差し戻し→協力会社承認済みの請求書はスキップ
            # （acknowledge_return が経理確認ステップに直接設定しているため、巻き戻してはいけない）
            if invoice.partner_acknowledged_at is not None:
                self.stdout.write(
                    f'Invoice {invoice.invoice_number}: 差し戻し承認済みのためスキップ（経理確認段階を維持）'
                )
                continue

            # 承認済み履歴の数をカウント（却下などは除く）
            approved_count = invoice.approval_histories.filter(action='approved').count()
            
            # 本来あるべきステップ
            # 例: 1件承認済み -> 次は steps[1] (Order 2)
            
            if approved_count < len(steps):
                correct_step = steps[approved_count]
                
                # 現在の状態と比較
                current_step_name = invoice.current_approval_step.step_name if invoice.current_approval_step else "None"
                current_approver_name = invoice.current_approver.last_name if invoice.current_approver else "None"
                
                # ユーザー名の取得（修正後）
                target_user_name = "None"
                if correct_step.approver_user:
                    target_user_name = correct_step.approver_user.last_name
                else:
                    target_user_name = f"Position: {correct_step.get_approver_position_display()}"

                self.stdout.write(f'\nInvoice {invoice.invoice_number}:')
                self.stdout.write(f'  承認数: {approved_count}')
                self.stdout.write(f'  現状: Step={current_step_name}, Approver={current_approver_name}')
                self.stdout.write(f'  修正: Step={correct_step.step_name}, Approver={target_user_name}')

                # 修正適用
                invoice.current_approval_step = correct_step
                
                # 承認者の設定
                if correct_step.approver_position == 'accountant':
                    # 経理ステップ: 経理なら誰でも承認可能なのでNone
                    invoice.current_approver = None
                elif correct_step.approver_user:
                    invoice.current_approver = correct_step.approver_user
                else:
                    # ユーザー指定がない場合は役職から検索（最新のアクティブユーザーを優先）
                    approver = User.objects.filter(
                        position=correct_step.approver_position,
                        is_active=True
                    ).order_by('-id').first()
                    invoice.current_approver = approver

                invoice.save()
                updates += 1
                self.stdout.write(self.style.SUCCESS('  ✨ 修正完了'))
            else:
                self.stdout.write(self.style.WARNING(f'Invoice {invoice.invoice_number}: 承認数({approved_count})がステップ数を超えています。確認が必要ですが一旦スキップします。'))

        self.stdout.write(f'\n計 {updates} 件の請求書を修正しました。')
