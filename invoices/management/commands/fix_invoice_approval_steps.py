#!/usr/bin/env python3
"""
請求書に承認ステップを設定する修正スクリプト
"""
from django.core.management.base import BaseCommand
from invoices.models import Invoice, ApprovalRoute, ApprovalStep, User, Company

class Command(BaseCommand):
    help = '承認ステップが未設定の請求書を修正する'

    def add_arguments(self, parser):
        parser.add_argument(
            '--check-only',
            action='store_true',
            help='修正せずに確認のみ行う',
        )
        parser.add_argument(
            '--invoice-id',
            type=int,
            help='特定の請求書IDのみ修正',
        )

    def handle(self, *args, **options):
        check_only = options['check_only']
        invoice_id = options.get('invoice_id')
        
        self.stdout.write("=" * 60)
        self.stdout.write("承認ステップ設定状況の確認")
        self.stdout.write("=" * 60)
        
        # 対象の請求書を取得
        if invoice_id:
            invoices = Invoice.objects.filter(id=invoice_id, status='pending_approval')
        else:
            invoices = Invoice.objects.filter(
                status='pending_approval',
                current_approval_step__isnull=True
            )
        
        self.stdout.write(f"\n対象請求書: {invoices.count()}件\n")
        
        if not invoices.exists():
            self.stdout.write(self.style.SUCCESS("修正が必要な請求書はありません"))
            return
        
        for invoice in invoices:
            self.stdout.write("-" * 60)
            self.stdout.write(f"請求書ID: {invoice.id}")
            self.stdout.write(f"  請求書番号: {invoice.invoice_number}")
            self.stdout.write(f"  承認ルート: {invoice.approval_route_id if invoice.approval_route else 'なし'}")
            self.stdout.write(f"  現在の承認ステップ: {invoice.current_approval_step_id if invoice.current_approval_step else 'なし'}")
            self.stdout.write(f"  工事現場: {invoice.construction_site.name if invoice.construction_site else 'なし'}")
            
            if check_only:
                continue
            
            # 修正処理
            try:
                if not invoice.construction_site:
                    self.stdout.write(self.style.ERROR("  ⚠️ 工事現場が未設定のため修正不可"))
                    continue
                
                if not invoice.construction_site.supervisor:
                    self.stdout.write(self.style.ERROR("  ⚠️ 現場監督が未設定のため修正不可"))
                    continue
                
                if not invoice.receiving_company:
                    self.stdout.write(self.style.ERROR("  ⚠️ 受取企業が未設定のため修正不可"))
                    continue
                
                # 承認ルートの作成または取得
                if not invoice.approval_route:
                    route_name = f"Approval Flow for {invoice.invoice_number}"
                    approval_route = ApprovalRoute.objects.create(
                        company=invoice.receiving_company,
                        name=route_name,
                        description=f'請求書 {invoice.invoice_number} 専用の承認ルート',
                        is_default=False
                    )
                    
                    # 承認ステップの定義
                    step_definitions = [
                        (1, '現場監督承認', 'site_supervisor'),
                        (2, '常務承認', 'managing_director'),
                        (3, '専務承認', 'senior_managing_director'),
                        (4, '社長承認', 'president'),
                        (5, '経理確認', 'accountant'),
                    ]
                    
                    # ステップの作成
                    first_step = None
                    for order, name, position in step_definitions:
                        user_to_assign = None
                        if position == 'site_supervisor':
                            user_to_assign = invoice.construction_site.supervisor
                        
                        step = ApprovalStep.objects.create(
                            route=approval_route,
                            step_order=order,
                            step_name=name,
                            approver_position=position,
                            approver_user=user_to_assign
                        )
                        if order == 1:
                            first_step = step
                    
                    invoice.approval_route = approval_route
                    invoice.current_approval_step = first_step
                    invoice.current_approver = invoice.construction_site.supervisor
                    invoice.save()
                    
                    self.stdout.write(self.style.SUCCESS(f"  ✓ 承認ルートとステップを作成しました"))
                else:
                    # 承認ルートはあるがステップが未設定の場合
                    first_step = invoice.approval_route.steps.filter(step_order=1).first()
                    if first_step:
                        invoice.current_approval_step = first_step
                        if first_step.approver_user:
                            invoice.current_approver = first_step.approver_user
                        else:
                            # 役職から承認者を検索
                            approver = User.objects.filter(
                                user_type='internal',
                                company=invoice.receiving_company,
                                position=first_step.approver_position,
                                is_active=True
                            ).first()
                            if approver:
                                invoice.current_approver = approver
                        invoice.save()
                        self.stdout.write(self.style.SUCCESS(f"  ✓ 現在の承認ステップを設定しました"))
                    else:
                        self.stdout.write(self.style.ERROR("  ⚠️ 承認ルートにステップがありません"))
                        
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"  ✗ エラー: {str(e)}"))
        
        self.stdout.write("\n" + "=" * 60)
        if check_only:
            self.stdout.write(self.style.WARNING("確認のみモードで実行しました"))
            self.stdout.write("修正するには --check-only フラグを外して再実行してください")
        else:
            self.stdout.write(self.style.SUCCESS("修正処理が完了しました"))
