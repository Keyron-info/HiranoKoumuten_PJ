# invoices/views.py - 完全統合版（改良版create_test_data含む）

from django.http import HttpResponse, JsonResponse
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.core.paginator import Paginator
from django.utils import timezone
from django.db.models import Sum, Count, Q
from datetime import timedelta
import uuid

# モデルのインポート（存在しないものはコメントアウト）
try:
    from .models import Invoice, Company, CustomerCompany, ApprovalHistory, InvoiceComment
except ImportError:
    from .models import Invoice
    # 他のモデルが存在しない場合のダミー
    Company = None
    CustomerCompany = None
    ApprovalHistory = None
    InvoiceComment = None

# フォームのインポート（存在しない場合のダミー）
try:
    from .forms import InvoiceUploadForm
except ImportError:
    InvoiceUploadForm = None


def invoice_list(request):
    """請求書一覧表示（ログイン不要版）"""
    try:
        # ユーザーがログインしているかチェック
        if hasattr(request, 'user') and request.user.is_authenticated:
            # ログインユーザーの場合の処理
            if hasattr(request.user, 'user_type'):
                if request.user.user_type == 'customer':
                    invoices = Invoice.objects.filter(customer_company=request.user.customer_company)
                else:
                    invoices = Invoice.objects.filter(receiving_company=request.user.company)
            else:
                invoices = Invoice.objects.all()
        else:
            # ログインしていない場合は全ての請求書を表示
            invoices = Invoice.objects.all()
        
        # フィルタリング処理
        status_filter = request.GET.get('status')
        company_filter = request.GET.get('company')
        date_from = request.GET.get('date_from')
        date_to = request.GET.get('date_to')
        amount_min = request.GET.get('amount_min')
        amount_max = request.GET.get('amount_max')
        search_query = request.GET.get('search')
        
        if status_filter:
            invoices = invoices.filter(status=status_filter)
        
        if search_query:
            # 検索フィールドを動的に決定
            search_fields = []
            for field in ['invoice_number', 'unique_number', 'project_name', 'project_code']:
                if hasattr(Invoice, field):
                    search_fields.append(Q(**{f"{field}__icontains": search_query}))
            
            if search_fields:
                query = search_fields[0]
                for field in search_fields[1:]:
                    query |= field
                invoices = invoices.filter(query)
        
        if amount_min:
            try:
                invoices = invoices.filter(amount__gte=float(amount_min))
            except (ValueError, TypeError):
                pass
        
        if amount_max:
            try:
                invoices = invoices.filter(amount__lte=float(amount_max))
            except (ValueError, TypeError):
                pass
        
        # 並び替え
        sort_by = request.GET.get('sort', '-created_at')
        valid_sorts = ['created_at', '-created_at', 'amount', '-amount', 'status']
        if hasattr(Invoice, 'due_date'):
            valid_sorts.extend(['due_date', '-due_date'])
        
        if sort_by in valid_sorts:
            invoices = invoices.order_by(sort_by)
        
        # ページネーション
        paginator = Paginator(invoices, 10)
        page_number = request.GET.get('page')
        page_obj = paginator.get_page(page_number)
        
        # フィルタ用の選択肢を取得
        all_invoices = Invoice.objects.all()
        status_choices = all_invoices.values_list('status', flat=True).distinct()
        
        context = {
            'page_obj': page_obj,
            'invoices': page_obj,
            'status_choices': status_choices,
            'current_filters': {
                'status': status_filter,
                'company': company_filter,
                'date_from': date_from,
                'date_to': date_to,
                'amount_min': amount_min,
                'amount_max': amount_max,
                'sort': sort_by,
                'search': search_query,
            }
        }
        return render(request, 'invoices/invoice_list.html', context)
        
    except Exception as e:
        # エラーが発生した場合のフォールバック
        return HttpResponse(f"""
        <html>
        <body>
        <h1>請求書一覧</h1>
        <p>エラーが発生しました: {e}</p>
        <p><a href="/invoices/debug/">デバッグページ</a></p>
        </body>
        </html>
        """)


def upload_invoice(request):
    """請求書アップロード"""
    if InvoiceUploadForm and hasattr(request, 'user') and request.user.is_authenticated:
        # フォームが存在し、ユーザーがログインしている場合
        if request.method == 'POST':
            form = InvoiceUploadForm(request.POST, request.FILES, user=request.user)
            if form.is_valid():
                invoice = form.save(commit=False)
                invoice.created_by = request.user
                
                if hasattr(request.user, 'user_type'):
                    if request.user.user_type == 'customer':
                        invoice.customer_company = request.user.customer_company
                        invoice.status = 'submitted'
                    else:
                        invoice.receiving_company = request.user.company
                        invoice.status = 'received'
                
                invoice.save()
                messages.success(request, '請求書がアップロードされました。')
                return redirect('invoice_list')
        else:
            form = InvoiceUploadForm(user=request.user)
        
        return render(request, 'invoices/upload_invoice.html', {'form': form})
    else:
        # 簡易版アップロードページ
        return HttpResponse("""
        <html>
        <body>
        <h1>請求書アップロード</h1>
        <p>この機能は準備中です。</p>
        <a href="/invoices/">一覧に戻る</a><br>
        <a href="/invoices/debug/">デバッグページ</a>
        </body>
        </html>
        """)


def invoice_detail(request, invoice_id):
    """請求書詳細表示"""
    try:
        invoice = get_object_or_404(Invoice, id=invoice_id)
        
        # アクセス権限チェック（ログインしている場合のみ）
        if hasattr(request, 'user') and request.user.is_authenticated:
            if hasattr(request.user, 'user_type'):
                if request.user.user_type == 'customer':
                    if hasattr(invoice, 'customer_company') and invoice.customer_company != request.user.customer_company:
                        messages.error(request, 'アクセス権限がありません。')
                        return redirect('invoice_list')
                else:
                    if hasattr(invoice, 'receiving_company') and invoice.receiving_company != request.user.company:
                        messages.error(request, 'アクセス権限がありません。')
                        return redirect('invoice_list')
        
        # コメント取得（モデルが存在する場合のみ）
        comments = []
        if InvoiceComment:
            try:
                if hasattr(request, 'user') and request.user.is_authenticated and hasattr(request.user, 'user_type'):
                    if request.user.user_type == 'internal':
                        comments = invoice.comments.all()
                    else:
                        comments = invoice.comments.filter(is_private=False)
                else:
                    comments = []
            except:
                comments = []
        
        # 承認履歴取得（モデルが存在する場合のみ）
        approval_history = []
        if ApprovalHistory:
            try:
                approval_history = invoice.approval_histories.all()
            except:
                approval_history = []
        
        context = {
            'invoice': invoice,
            'comments': comments,
            'approval_history': approval_history,
            'can_approve': (
                hasattr(request, 'user') and 
                request.user.is_authenticated and 
                hasattr(request.user, 'user_type') and
                request.user.user_type == 'internal' and 
                hasattr(invoice, 'status') and
                invoice.status in ['submitted', 'pending_approval']
            )
        }
        return render(request, 'invoices/invoice_detail.html', context)
        
    except Exception as e:
        return HttpResponse(f"""
        <html>
        <body>
        <h1>請求書詳細エラー</h1>
        <p>エラー: {e}</p>
        <a href="/invoices/">一覧に戻る</a>
        </body>
        </html>
        """)


def approve_invoice(request, invoice_id):
    """請求書承認"""
    if request.method != 'POST':
        return JsonResponse({'error': '無効なリクエストです'}, status=400)
    
    invoice = get_object_or_404(Invoice, id=invoice_id)
    
    # 権限チェック
    if not (hasattr(request, 'user') and request.user.is_authenticated):
        return JsonResponse({'error': 'ログインが必要です'}, status=403)
    
    if hasattr(request.user, 'user_type') and request.user.user_type != 'internal':
        return JsonResponse({'error': '承認権限がありません'}, status=403)
    
    # 承認処理
    comment = request.POST.get('comment', '')
    
    # ステータス更新
    if hasattr(invoice, 'status'):
        invoice.status = 'approved'
        invoice.save()
    
    # 承認履歴追加（モデルが存在する場合のみ）
    if ApprovalHistory:
        try:
            ApprovalHistory.objects.create(
                invoice=invoice,
                user=request.user,
                action='approved',
                comment=comment
            )
        except:
            pass
    
    # コメント追加（モデルが存在する場合のみ）
    if InvoiceComment and comment:
        try:
            InvoiceComment.objects.create(
                invoice=invoice,
                user=request.user,
                comment_type='approval',
                comment=f'承認時コメント: {comment}',
                is_private=False
            )
        except:
            pass
    
    messages.success(request, f'請求書を承認しました。')
    return JsonResponse({'success': True})


def reject_invoice(request, invoice_id):
    """請求書却下"""
    if request.method != 'POST':
        return JsonResponse({'error': '無効なリクエストです'}, status=400)
    
    invoice = get_object_or_404(Invoice, id=invoice_id)
    
    # 権限チェック
    if not (hasattr(request, 'user') and request.user.is_authenticated):
        return JsonResponse({'error': 'ログインが必要です'}, status=403)
    
    if hasattr(request.user, 'user_type') and request.user.user_type != 'internal':
        return JsonResponse({'error': '却下権限がありません'}, status=403)
    
    # 却下理由チェック
    comment = request.POST.get('comment', '').strip()
    if not comment:
        return JsonResponse({'error': '却下理由を入力してください'}, status=400)
    
    # 却下処理
    if hasattr(invoice, 'status'):
        invoice.status = 'rejected'
        invoice.save()
    
    messages.success(request, f'請求書を却下しました。')
    return JsonResponse({'success': True})


def return_invoice(request, invoice_id):
    """請求書差し戻し"""
    if request.method != 'POST':
        return JsonResponse({'error': '無効なリクエストです'}, status=400)
    
    invoice = get_object_or_404(Invoice, id=invoice_id)
    
    # 権限チェック
    if not (hasattr(request, 'user') and request.user.is_authenticated):
        return JsonResponse({'error': 'ログインが必要です'}, status=403)
    
    # 差し戻し理由チェック
    comment = request.POST.get('comment', '').strip()
    if not comment:
        return JsonResponse({'error': '差し戻し理由を入力してください'}, status=400)
    
    # 差し戻し処理
    if hasattr(invoice, 'status'):
        invoice.status = 'returned'
        invoice.save()
    
    messages.success(request, f'請求書を差し戻しました。')
    return JsonResponse({'success': True})


def add_comment(request, invoice_id):
    """コメント追加"""
    if request.method != 'POST':
        return JsonResponse({'error': '無効なリクエストです'}, status=400)
    
    invoice = get_object_or_404(Invoice, id=invoice_id)
    
    comment_text = request.POST.get('comment', '').strip()
    if not comment_text:
        return JsonResponse({'error': 'コメントを入力してください'}, status=400)
    
    # コメント追加（モデルが存在する場合のみ）
    if InvoiceComment:
        try:
            comment_type = request.POST.get('comment_type', 'general')
            is_private = request.POST.get('is_private') == 'on'
            
            comment = InvoiceComment.objects.create(
                invoice=invoice,
                user=request.user if hasattr(request, 'user') and request.user.is_authenticated else None,
                comment_type=comment_type,
                comment=comment_text,
                is_private=is_private
            )
            
            messages.success(request, 'コメントを追加しました。')
            return JsonResponse({'success': True})
        except Exception as e:
            return JsonResponse({'error': f'コメント追加エラー: {e}'}, status=500)
    else:
        return JsonResponse({'error': 'コメント機能は利用できません'}, status=400)


def dashboard(request):
    """ダッシュボード表示"""
    try:
        # ユーザーの種別に応じてデータを取得
        if hasattr(request, 'user') and request.user.is_authenticated and hasattr(request.user, 'user_type'):
            if request.user.user_type == 'customer':
                invoices = Invoice.objects.filter(customer_company=request.user.customer_company)
            else:
                invoices = Invoice.objects.filter(receiving_company=request.user.company)
        else:
            invoices = Invoice.objects.all()
        
        # 統計データ計算
        today = timezone.now().date()
        current_month = today.replace(day=1)
        
        # 基本統計
        total_invoices = invoices.count()
        pending_approval = invoices.filter(status='pending_approval').count()
        submitted_invoices = invoices.filter(status='submitted').count()
        approved_invoices = invoices.filter(status='approved').count()
        
        # 金額統計
        total_amount = invoices.aggregate(total=Sum('amount'))['total'] or 0
        pending_amount = invoices.filter(
            status__in=['submitted', 'pending_approval']
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        # 今月の統計
        this_month_invoices = invoices.filter(created_at__gte=current_month)
        this_month_count = this_month_invoices.count()
        this_month_amount = this_month_invoices.aggregate(total=Sum('amount'))['total'] or 0
        
        # 支払期日が近い請求書（7日以内）
        upcoming_due = []
        if hasattr(Invoice, 'due_date'):
            upcoming_due = invoices.filter(
                due_date__lte=today + timedelta(days=7),
                status__in=['approved', 'payment_preparing']
            ).order_by('due_date')[:5]
        
        # 最近の活動（最新5件）
        recent_invoices = invoices.order_by('-created_at')[:5]
        
        # ステータス別分布
        status_distribution = invoices.values('status').annotate(
            count=Count('id'),
            amount=Sum('amount')
        )
        
        context = {
            'total_invoices': total_invoices,
            'pending_approval': pending_approval,
            'submitted_invoices': submitted_invoices,
            'approved_invoices': approved_invoices,
            'total_amount': total_amount,
            'pending_amount': pending_amount,
            'this_month_count': this_month_count,
            'this_month_amount': this_month_amount,
            'upcoming_due': upcoming_due,
            'recent_invoices': recent_invoices,
            'status_distribution': status_distribution,
        }
        
        return render(request, 'invoices/dashboard.html', context)
        
    except Exception as e:
        return HttpResponse(f"""
        <html>
        <body>
        <h1>ダッシュボードエラー</h1>
        <p>エラー: {e}</p>
        <a href="/invoices/">請求書一覧</a>
        </body>
        </html>
        """)


def debug_invoices(request):
    """デバッグ用：請求書データの確認"""
    try:
        invoices = Invoice.objects.all()
        
        # モデルのフィールド情報を取得
        model_fields = [f.name for f in Invoice._meta.get_fields()]
        
        debug_info = f"""
        <html>
        <head><title>デバッグ情報</title></head>
        <body>
        <h1>デバッグ情報</h1>
        <h2>請求書データ総数: {invoices.count()}</h2>
        
        <h3>Invoiceモデルのフィールド:</h3>
        <p>{', '.join(model_fields)}</p>
        
        <h3>請求書一覧:</h3>
        <ul>
        """
        
        for invoice in invoices:
            # 各フィールドの値を安全に取得
            invoice_number = getattr(invoice, 'invoice_number', 'N/A')
            vendor_name = getattr(invoice, 'vendor_name', 
                                getattr(invoice, 'customer_company', 'Unknown'))
            status = getattr(invoice, 'status', 'N/A')
            amount = getattr(invoice, 'amount', 0)
            created_at = getattr(invoice, 'created_at', 'N/A')
            unique_url = getattr(invoice, 'unique_url', 'N/A')
            
            debug_info += f"""
            <li>
                <strong>ID:</strong> {invoice.id}<br>
                <strong>請求書番号:</strong> {invoice_number}<br>
                <strong>請求元:</strong> {vendor_name}<br>
                <strong>ステータス:</strong> {status}<br>
                <strong>金額:</strong> ¥{amount}<br>
                <strong>作成日:</strong> {created_at}<br>
                <strong>UUID:</strong> {unique_url}<br>
                <strong>詳細URL:</strong> <a href="/invoices/detail/{invoice.id}/">詳細ページ</a><br>
                ---<br><br>
            </li>
            """
        
        debug_info += f"""
        </ul>
        
        <h3>URLテスト:</h3>
        <a href="/invoices/">請求書一覧へ</a><br>
        <a href="/invoices/upload/">アップロードページへ</a><br>
        <a href="/invoices/dashboard/">ダッシュボードへ</a><br>
        
        <h3>テストデータ作成:</h3>
        <a href="/invoices/debug/create-test/">テストデータを作成</a>
        
        <h3>システム情報:</h3>
        <p>利用可能なモデル: {[cls.__name__ for cls in [Invoice, Company, CustomerCompany, ApprovalHistory, InvoiceComment] if cls is not None]}</p>
        
        </body>
        </html>
        """
        
        return HttpResponse(debug_info)
        
    except Exception as e:
        import traceback
        return HttpResponse(f"""
        <html>
        <body>
        <h1>デバッグエラー</h1>
        <p>エラー: {e}</p>
        <pre>{traceback.format_exc()}</pre>
        <a href="/invoices/">請求書一覧に戻る</a>
        </body>
        </html>
        """)


# invoices/views.py の create_test_data 関数を以下に置き換えてください

def create_test_data(request):
    """テストデータを作成（修正版）"""
    try:
        # 基本的なテストデータを直接定義（安全確実な方法）
        today = timezone.now().date()
        now = timezone.now()
        
        # 確実に設定するべき基本フィールド
        test_data = {
            'invoice_number': f"TEST-{now.strftime('%Y%m%d%H%M%S')}",
            'amount': 150000,  # 確実に設定
            'tax_amount': 15000,
            'status': 'draft',
            'issue_date': today,
            'due_date': today,
            'unique_url': uuid.uuid4(),
            'project_name': "テストプロジェクト",
            'department_code': "TEST-DEPT",
        }
        
        # モデルの実際のフィールドを確認
        model_fields = [f.name for f in Invoice._meta.get_fields() if not hasattr(f, 'related_model')]
        
        # 存在しないフィールドを除去
        final_test_data = {}
        for key, value in test_data.items():
            if key in model_fields:
                final_test_data[key] = value
        
        # デバッグ情報をHTMLで表示
        debug_html = f"""
        <html>
        <body>
        <h1>テストデータ作成情報</h1>
        
        <h2>利用可能なモデルフィールド:</h2>
        <p>{', '.join(model_fields)}</p>
        
        <h2>作成予定のテストデータ:</h2>
        <pre>{final_test_data}</pre>
        
        <h2>除外されたフィールド:</h2>
        <p>{[key for key in test_data.keys() if key not in model_fields]}</p>
        
        <p><a href="?execute=true">実際にテストデータを作成する</a></p>
        
        <a href="/invoices/debug/">デバッグページに戻る</a>
        </body>
        </html>
        """
        
        # 実際の作成処理
        if request.GET.get('execute') == 'true':
            test_invoice = Invoice.objects.create(**final_test_data)
            
            return HttpResponse(f"""
            <html>
            <body>
            <h1>テストデータ作成完了</h1>
            <p>請求書ID: {test_invoice.id}</p>
            <p>請求書番号: {test_invoice.invoice_number}</p>
            <p>金額: ¥{test_invoice.amount}</p>
            <p>使用したフィールド: {list(final_test_data.keys())}</p>
            
            <h3>作成されたデータの詳細:</h3>
            <ul>
                <li>ID: {test_invoice.id}</li>
                <li>請求書番号: {getattr(test_invoice, 'invoice_number', 'N/A')}</li>
                <li>金額: ¥{getattr(test_invoice, 'amount', 'N/A')}</li>
                <li>ステータス: {getattr(test_invoice, 'status', 'N/A')}</li>
                <li>発行日: {getattr(test_invoice, 'issue_date', 'N/A')}</li>
                <li>支払期日: {getattr(test_invoice, 'due_date', 'N/A')}</li>
            </ul>
            
            <a href="/invoices/">一覧に戻る</a><br>
            <a href="/invoices/detail/{test_invoice.id}/">この請求書の詳細</a><br>
            <a href="/invoices/debug/">デバッグページに戻る</a>
            </body>
            </html>
            """)
        else:
            return HttpResponse(debug_html)
        
    except Exception as e:
        import traceback
        return HttpResponse(f"""
        <html>
        <body>
        <h1>テストデータ作成エラー</h1>
        <p>エラー: {e}</p>
        <pre>{traceback.format_exc()}</pre>
        
        <h3>デバッグ情報:</h3>
        <p>利用可能なフィールド: {[f.name for f in Invoice._meta.get_fields() if not hasattr(f, 'related_model')]}</p>
        
        <a href="/invoices/debug/">デバッグページに戻る</a>
        </body>
        </html>
        """)