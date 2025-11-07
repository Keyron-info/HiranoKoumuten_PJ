from django.shortcuts import render, redirect
from django.http import HttpResponse

# --- 基本ページ ---
def invoice_list(request):
    return HttpResponse("請求書一覧ページ（invoice_list）")

def dashboard(request):
    return HttpResponse("ダッシュボード（dashboard）")

def upload_invoice(request):
    return HttpResponse("請求書アップロード（upload_invoice）")

# --- 詳細・承認系 ---
def invoice_detail(request, invoice_id):
    return HttpResponse(f"請求書詳細ページ ID={invoice_id}")

def approve_invoice(request, invoice_id):
    return HttpResponse(f"請求書 ID={invoice_id} を承認しました")

def reject_invoice(request, invoice_id):
    return HttpResponse(f"請求書 ID={invoice_id} を却下しました")

def return_invoice(request, invoice_id):
    return HttpResponse(f"請求書 ID={invoice_id} を差し戻しました")

# --- コメント ---
def add_comment(request, invoice_id):
    return HttpResponse(f"請求書 ID={invoice_id} にコメントを追加しました")

# --- デバッグ用 ---
def debug_invoices(request):
    return HttpResponse("デバッグ用請求書リスト（debug_invoices）")

def create_test_data(request):
    return HttpResponse("テストデータを作成しました（create_test_data）")
