#!/usr/bin/env python3
"""
請求書の承認ステップ設定状況を確認するスクリプト
"""
import os
import sys
import django

# Django settings setup
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'keyron_project.settings')
django.setup()

from invoices.models import Invoice

def check_invoices():
    """承認待ちの請求書で承認ステップが未設定のものを確認"""
    print("=" * 60)
    print("承認ステップ設定状況の確認")
    print("=" * 60)
    
    # 承認待ち状態の請求書を取得
    pending_invoices = Invoice.objects.filter(status='pending_approval')
    print(f"\n承認待ち状態の請求書: {pending_invoices.count()}件")
    
    # 承認ステップが未設定の請求書
    invoices_without_steps = pending_invoices.filter(current_approval_step__isnull=True)
    print(f"承認ステップ未設定: {invoices_without_steps.count()}件")
    
    if invoices_without_steps.exists():
        print("\n【承認ステップが未設定の請求書】")
        print("-" * 60)
        for invoice in invoices_without_steps:
            print(f"ID: {invoice.id}")
            print(f"  請求書番号: {invoice.invoice_number}")
            print(f"  ステータス: {invoice.get_status_display()}")
            print(f"  承認ルート: {invoice.approval_route_id if invoice.approval_route else 'なし'}")
            print(f"  現在の承認ステップ: {invoice.current_approval_step_id if invoice.current_approval_step else 'なし'}")
            print(f"  現在の承認者: {invoice.current_approver.username if invoice.current_approver else 'なし'}")
            print(f"  工事現場: {invoice.construction_site.name if invoice.construction_site else 'なし'}")
            print(f"  作成日: {invoice.created_at}")
            print("-" * 60)
    
    # 承認ルートが未設定の請求書
    invoices_without_routes = pending_invoices.filter(approval_route__isnull=True)
    print(f"\n承認ルート未設定: {invoices_without_routes.count()}件")
    
    if invoices_without_routes.exists():
        print("\n【承認ルートが未設定の請求書】")
        print("-" * 60)
        for invoice in invoices_without_routes:
            print(f"ID: {invoice.id}")
            print(f"  請求書番号: {invoice.invoice_number}")
            print(f"  工事現場: {invoice.construction_site.name if invoice.construction_site else 'なし'}")
            print("-" * 60)
    
    # すべての請求書の状態確認
    print(f"\n【全請求書の状態】")
    statuses = Invoice.objects.values_list('status', flat=True).distinct()
    for status in statuses:
        count = Invoice.objects.filter(status=status).count()
        print(f"  {status}: {count}件")

if __name__ == '__main__':
    check_invoices()
