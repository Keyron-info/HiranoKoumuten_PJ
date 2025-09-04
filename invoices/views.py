# invoices/views.py

from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.core.paginator import Paginator
from .models import Invoice, Company, CustomerCompany
from .forms import InvoiceUploadForm


@login_required
def invoice_list(request):
    """請求書一覧表示"""
    # ユーザーの種別に応じてフィルタリング
    if request.user.user_type == 'customer':
        invoices = Invoice.objects.filter(customer_company=request.user.customer_company)
    else:
        # 社内ユーザーの場合、所属会社の請求書を表示
        invoices = Invoice.objects.filter(receiving_company=request.user.company)
    
    # ページネーション
    paginator = Paginator(invoices, 10)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    
    context = {
        'page_obj': page_obj,
        'invoices': page_obj,
    }
    return render(request, 'invoices/invoice_list.html', context)


@login_required
def upload_invoice(request):
    """請求書アップロード"""
    if request.method == 'POST':
        form = InvoiceUploadForm(request.POST, request.FILES, user=request.user)
        if form.is_valid():
            invoice = form.save(commit=False)
            invoice.created_by = request.user
            
            # ユーザー種別に応じて自動設定
            if request.user.user_type == 'customer':
                invoice.customer_company = request.user.customer_company
                invoice.status = 'submitted'  # 顧客が送付した場合
            else:
                invoice.receiving_company = request.user.company
                invoice.status = 'received'   # 社内ユーザーが作成した場合
                
            invoice.save()
            messages.success(request, '請求書がアップロードされました。')
            return redirect('invoice_list')
    else:
        form = InvoiceUploadForm(user=request.user)
    
    return render(request, 'invoices/upload_invoice.html', {'form': form})


@login_required
def invoice_detail(request, invoice_id):
    """請求書詳細表示"""
    invoice = get_object_or_404(Invoice, id=invoice_id)
    
    # アクセス権限チェック
    if request.user.user_type == 'customer':
        if invoice.customer_company != request.user.customer_company:
            messages.error(request, 'アクセス権限がありません。')
            return redirect('invoice_list')
    else:
        if invoice.receiving_company != request.user.company:
            messages.error(request, 'アクセス権限がありません。')
            return redirect('invoice_list')
    
    context = {
        'invoice': invoice,
    }
    return render(request, 'invoices/invoice_detail.html', context)