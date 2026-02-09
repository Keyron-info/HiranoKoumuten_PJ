# invoices/api_views.py

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.shortcuts import get_object_or_404
from django.db.models import Q, Sum
from django.core.mail import send_mail
from django.conf import settings

from .models import (
    Company, Department, CustomerCompany, User, ConstructionSite,
    Invoice, InvoiceItem, ApprovalRoute, ApprovalStep,
    ApprovalHistory, InvoiceComment
)
from .serializers import (
    CompanySerializer, DepartmentSerializer, CustomerCompanySerializer,
    UserSerializer, UserRegistrationSerializer,
    InvoiceSerializer, InvoiceListSerializer, InvoiceCreateSerializer,
    ApprovalRouteSerializer, ApprovalStepSerializer,
    ApprovalHistorySerializer, InvoiceCommentSerializer,
    ConstructionSiteSerializer
)


class IsCustomerUser(permissions.BasePermission):
    """顧客ユーザー(協力会社)かどうかをチェック"""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.user_type == 'customer'


class IsInternalUser(permissions.BasePermission):
    """社内ユーザーかどうかをチェック"""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.user_type == 'internal'


class UserRegistrationViewSet(viewsets.GenericViewSet):
    """ユーザー登録API"""
    permission_classes = [AllowAny]
    serializer_class = UserRegistrationSerializer
    
    @action(detail=False, methods=['post'])
    def register(self, request):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response({
                'message': '登録が完了しました。承認までお待ちください。',
                'user': UserSerializer(user).data
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserProfileViewSet(viewsets.GenericViewSet):
    """ユーザープロフィールAPI"""
    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer
    
    @action(detail=False, methods=['get'])
    def me(self, request):
        """現在のユーザー情報を取得"""
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)
    
    @action(detail=False, methods=['patch'])
    def update_profile(self, request):
        """プロフィール更新"""
        serializer = self.get_serializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CustomerCompanyViewSet(viewsets.ModelViewSet):
    """顧客会社API"""
    queryset = CustomerCompany.objects.all()
    serializer_class = CustomerCompanySerializer
    permission_classes = [IsAuthenticated]


class CompanyViewSet(viewsets.ModelViewSet):
    """会社API"""
    queryset = Company.objects.all()
    serializer_class = CompanySerializer
    permission_classes = [IsAuthenticated]


class ConstructionSiteViewSet(viewsets.ModelViewSet):
    """工事現場API"""
    queryset = ConstructionSite.objects.filter(is_active=True)
    serializer_class = ConstructionSiteSerializer
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['post'])
    def verify_password(self, request):
        """現場パスワードで現場を検索・検証"""
        password = request.data.get('password')
        if not password:
             return Response({'error': 'パスワードを入力してください'}, status=status.HTTP_400_BAD_REQUEST)
        
        # 現場パスワードで検索 (完全一致)
        site = ConstructionSite.objects.filter(site_password=password, is_active=True).first()
        
        if not site:
            return Response({'error': '該当する現場が見つかりません。パスワードを確認してください。'}, status=status.HTTP_404_NOT_FOUND)
            
        # 請求書作成可能チェック
        can_create, message = site.can_create_invoice()
        if not can_create:
            return Response({'error': message}, status=status.HTTP_400_BAD_REQUEST)
        
        return Response(self.get_serializer(site).data)

    def get_queryset(self):
        """ユーザーに応じた工事現場を返す"""
        queryset = ConstructionSite.objects.filter(is_active=True)
        return queryset.select_related('company', 'supervisor')
        
    def perform_create(self, serializer):
        """作成時に会社を自動設定"""
        user = self.request.user
        if user.company:
            serializer.save(company=user.company)
        else:
            # 会社が紐付いていないユーザーの場合は最初の会社を使用（またはエラー）
            # ここではデフォルトの挙動として最初の会社を取得
            company = Company.objects.first()
            if company:
                serializer.save(company=company)
            else:
                 # 会社がない場合はエラーになるが、バリデーションで弾かれるはず
                serializer.save()


class InvoiceViewSet(viewsets.ModelViewSet):
    """請求書API"""
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        """アクションに応じたシリアライザーを使用"""
        if self.action == 'create':
            return InvoiceCreateSerializer
        elif self.action == 'list':
            return InvoiceListSerializer
        return InvoiceSerializer
    
    def get_queryset(self):
        """ユーザーに応じた請求書を返す"""
        user = self.request.user
        
        if user.user_type == 'customer':
            # 協力会社は自社の請求書のみ
            invoices = Invoice.objects.filter(customer_company=user.customer_company)
        else:
            # 社内ユーザーは全ての請求書
            invoices = Invoice.objects.filter(receiving_company=user.company)
        
        # ステータスフィルター
        status_filter = self.request.query_params.get('status')
        if status_filter and status_filter != 'all':
            invoices = invoices.filter(status=status_filter)
        
        # 自分の承認待ちフィルター
        if status_filter == 'my_approval':
            invoices = invoices.filter(current_approver=user)
        
        # 検索
        search = self.request.query_params.get('search')
        if search:
            invoices = invoices.filter(
                Q(invoice_number__icontains=search) |
                Q(project_name__icontains=search) |
                Q(construction_site_name__icontains=search)
            )
        
        return invoices.select_related(
            'customer_company', 
            'construction_site', 
            'created_by',
            'current_approver',
            'current_approval_step'
        ).order_by('-created_at')
    
    def create(self, request, *args, **kwargs):
        """請求書作成"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # シリアライザー内でcreated_by, customer_company, 金額計算が全て行われる
        invoice = serializer.save()
        
        return Response(
            InvoiceSerializer(invoice).data,
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        """
        請求書を提出
        - 協力会社ユーザーのみ実行可能
        - 自動で承認フローを開始
        """
        invoice = self.get_object()
        
        # 下書き状態のみ提出可能
        if invoice.status != 'draft':
            return Response(
                {'error': '下書き状態の請求書のみ提出できます'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 協力会社ユーザーのみ実行可能
        if request.user.user_type != 'customer':
            return Response(
                {'error': '協力会社ユーザーのみ実行できます'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # 工事現場の確認
        if not invoice.construction_site:
            return Response(
                {'error': '工事現場が設定されていません'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 現場監督の確認
        if not invoice.construction_site.supervisor:
            return Response(
                {'error': 'この工事現場には現場監督が設定されていません。システム管理者にお問い合わせください。'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # デフォルトの承認ルートを取得
        approval_route = ApprovalRoute.objects.filter(
            company=invoice.receiving_company,
            is_default=True,
            is_active=True
        ).first()
        
        if not approval_route:
            return Response(
                {'error': '承認ルートが設定されていません'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 承認ルートを設定
        invoice.approval_route = approval_route
        
        # 最初の承認ステップを取得
        first_step = approval_route.steps.filter(step_order=1).first()
        if not first_step:
            return Response(
                {'error': '承認ステップが設定されていません'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 現在の承認ステップと承認者を設定
        invoice.current_approval_step = first_step
        
        # 現場監督を承認者として設定
        invoice.current_approver = invoice.construction_site.supervisor
        
        # ステータスを「承認待ち」に変更
        invoice.status = 'pending_approval'
        invoice.save()
        
        # 提出履歴を記録
        ApprovalHistory.objects.create(
            invoice=invoice,
            user=request.user,
            action='submitted',
            comment='請求書を提出しました'
        )
        
        # 通知メール送信（コンソール出力）
        self._send_notification_email(
            recipient=invoice.current_approver,
            subject=f'【請求書承認依頼】{invoice.invoice_number}',
            message=f'''
{invoice.current_approver.get_full_name()} 様

請求書の承認依頼が届いています。

請求書番号: {invoice.invoice_number}
協力会社: {invoice.customer_company.name}
工事現場: {invoice.construction_site.name}
金額: ¥{invoice.total_amount:,}

システムにログインして確認してください。
            '''.strip()
        )
        
        return Response({
            'message': '請求書を提出しました。承認をお待ちください。',
            'invoice': InvoiceSerializer(invoice).data
        })
    
    @action(detail=True, methods=['post'], permission_classes=[IsInternalUser])
    def approve(self, request, pk=None):
        """
        請求書承認
        - 現在の承認ステップの担当者のみ実行可能
        - 経理は全ステップで実行可能
        """
        invoice = self.get_object()
        user = request.user
        comment = request.data.get('comment', '')
        
        # 承認待ち状態のみ承認可能
        if invoice.status != 'pending_approval':
            return Response(
                {'error': '承認待ち状態の請求書のみ承認できます'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 承認権限チェック
        can_approve = False
        
        # 現在の承認者である
        if invoice.current_approver == user:
            can_approve = True
        
        # 経理は全ステップで承認可能
        if user.position == 'accountant':
            can_approve = True
        
        if not can_approve:
            return Response(
                {'error': 'この請求書を承認する権限がありません'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # 承認履歴を記録
        ApprovalHistory.objects.create(
            invoice=invoice,
            approval_step=invoice.current_approval_step,
            user=user,
            action='approved',
            comment=comment or f'{user.get_position_display()}が承認しました'
        )
        
        # 次の承認ステップへ進む
        current_step_order = invoice.current_approval_step.step_order
        next_step = invoice.approval_route.steps.filter(
            step_order=current_step_order + 1
        ).first()
        
        if next_step:
            # 次のステップがある場合
            invoice.current_approval_step = next_step
            
            # 次の承認者を設定
            if next_step.approver_user:
                invoice.current_approver = next_step.approver_user
            else:
                # 役職から承認者を検索
                next_approver = User.objects.filter(
                    user_type='internal',
                    company=invoice.receiving_company,
                    position=next_step.approver_position,
                    is_active=True
                ).first()
                
                if next_approver:
                    invoice.current_approver = next_approver
                else:
                    return Response(
                        {'error': f'次の承認者（{next_step.get_approver_position_display()}）が見つかりません'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            invoice.save()
            
            # 次の承認者に通知
            self._send_notification_email(
                recipient=invoice.current_approver,
                subject=f'【請求書承認依頼】{invoice.invoice_number}',
                message=f'''
{invoice.current_approver.get_full_name()} 様

請求書の承認依頼が届いています。

請求書番号: {invoice.invoice_number}
協力会社: {invoice.customer_company.name}
工事現場: {invoice.construction_site.name}
金額: ¥{invoice.total_amount:,}

前承認者: {user.get_full_name()} ({user.get_position_display()})

システムにログインして確認してください。
                '''.strip()
            )
            
            message = f'{next_step.step_name}に進みました'
        else:
            # 全ての承認ステップが完了
            invoice.status = 'approved'
            invoice.current_approval_step = None
            invoice.current_approver = None
            invoice.save()
            
            # 協力会社に承認完了通知
            self._send_notification_email(
                recipient=invoice.created_by,
                subject=f'【承認完了】{invoice.invoice_number}',
                message=f'''
{invoice.created_by.get_full_name()} 様

請求書が承認されました。

請求書番号: {invoice.invoice_number}
工事現場: {invoice.construction_site.name}
金額: ¥{invoice.total_amount:,}

お支払いまでしばらくお待ちください。
                '''.strip()
            )
            
            message = '全ての承認が完了しました'
        
        return Response({
            'message': message,
            'invoice': InvoiceSerializer(invoice).data
        })
    
    @action(detail=True, methods=['post'], permission_classes=[IsInternalUser])
    def reject(self, request, pk=None):
        """
        請求書却下
        - 現在の承認ステップの担当者のみ実行可能
        - 経理は全ステップで実行可能
        """
        invoice = self.get_object()
        user = request.user
        comment = request.data.get('comment', '')
        
        if invoice.status != 'pending_approval':
            return Response(
                {'error': '承認待ち状態の請求書のみ却下できます'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 却下権限チェック
        can_reject = False
        
        if invoice.current_approver == user:
            can_reject = True
        
        if user.position == 'accountant':
            can_reject = True
        
        if not can_reject:
            return Response(
                {'error': 'この請求書を却下する権限がありません'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # ステータス更新
        invoice.status = 'rejected'
        invoice.current_approval_step = None
        invoice.current_approver = None
        invoice.save()
        
        # 承認履歴追加
        ApprovalHistory.objects.create(
            invoice=invoice,
            approval_step=invoice.current_approval_step,
            user=user,
            action='rejected',
            comment=comment or '却下されました'
        )
        
        # 協力会社に通知
        self._send_notification_email(
            recipient=invoice.created_by,
            subject=f'【却下】{invoice.invoice_number}',
            message=f'''
{invoice.created_by.get_full_name()} 様

申し訳ございませんが、請求書が却下されました。

請求書番号: {invoice.invoice_number}
却下理由: {comment}

詳細はシステムでご確認ください。
            '''.strip()
        )
        
        return Response({
            'message': '請求書を却下しました',
            'invoice': InvoiceSerializer(invoice).data
        })
    
    @action(detail=True, methods=['post'], permission_classes=[IsInternalUser])
    def return_invoice(self, request, pk=None):
        """
        請求書差し戻し
        - 現在の承認ステップの担当者のみ実行可能
        - 経理は全ステップで実行可能
        """
        invoice = self.get_object()
        user = request.user
        comment = request.data.get('comment', '')
        
        if invoice.status != 'pending_approval':
            return Response(
                {'error': '承認待ち状態の請求書のみ差し戻しできます'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 差し戻し権限チェック
        can_return = False
        
        if invoice.current_approver == user:
            can_return = True
        
        if user.position == 'accountant':
            can_return = True
        
        if not can_return:
            return Response(
                {'error': 'この請求書を差し戻す権限がありません'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # ステータス更新
        invoice.status = 'returned'
        invoice.current_approval_step = None
        invoice.current_approver = None
        invoice.save()
        
        # 承認履歴追加
        ApprovalHistory.objects.create(
            invoice=invoice,
            approval_step=invoice.current_approval_step,
            user=user,
            action='returned',
            comment=comment or '差し戻されました'
        )
        
        # 協力会社に通知
        self._send_notification_email(
            recipient=invoice.created_by,
            subject=f'【差し戻し】{invoice.invoice_number}',
            message=f'''
{invoice.created_by.get_full_name()} 様

請求書が差し戻されました。修正して再提出してください。

請求書番号: {invoice.invoice_number}
差し戻し理由: {comment}

システムにログインして内容を確認してください。
            '''.strip()
        )
        
        return Response({
            'message': '請求書を差し戻しました',
            'invoice': InvoiceSerializer(invoice).data
        })
    
    @action(detail=True, methods=['get'])
    def comments(self, request, pk=None):
        """請求書のコメント一覧"""
        invoice = self.get_object()
        
        # 社内ユーザーは全てのコメント、顧客は非プライベートのみ
        if request.user.user_type == 'internal':
            comments = invoice.comments.all()
        else:
            comments = invoice.comments.filter(is_private=False)
        
        serializer = InvoiceCommentSerializer(comments, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def add_comment(self, request, pk=None):
        """コメント追加"""
        invoice = self.get_object()
        
        comment_text = request.data.get('comment', '')
        comment_type = request.data.get('comment_type', 'general')
        is_private = request.data.get('is_private', False)
        
        # 顧客はプライベートコメント不可
        if request.user.user_type == 'customer':
            is_private = False
        
        comment = InvoiceComment.objects.create(
            invoice=invoice,
            user=request.user,
            comment=comment_text,
            comment_type=comment_type,
            is_private=is_private
        )
        
        serializer = InvoiceCommentSerializer(comment)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    def _send_notification_email(self, recipient, subject, message):
        """
        通知メール送信（開発環境ではコンソール出力）
        """
        print(f"\n{'='*60}")
        print(f"📧 メール通知")
        print(f"{'='*60}")
        print(f"宛先: {recipient.email} ({recipient.get_full_name()})")
        print(f"件名: {subject}")
        print(f"\n{message}")
        print(f"{'='*60}\n")
        
        # 本番環境では実際にメール送信
        # send_mail(
        #     subject=subject,
        #     message=message,
        #     from_email=settings.DEFAULT_FROM_EMAIL,
        #     recipient_list=[recipient.email],
        #     fail_silently=True,
        # )
    @action(detail=False, methods=['get'], permission_classes=[AllowAny], authentication_classes=[])
    def debug_invoice(self, request):
        """
        [デバッグ用] 請求書の承認状態詳細を確認するエンドポイント
        /api/invoices/debug_invoice/?number=INV-2026-0010
        """
        invoice_number = request.query_params.get('number')
        if not invoice_number:
            return Response({'error': 'number parameter is required'}, status=400)
            
        try:
            invoice = Invoice.objects.get(invoice_number=invoice_number)
            
            # 関連データ取得
            approver = invoice.current_approver
            step = invoice.current_approval_step
            
            data = {
                'invoice_number': invoice.invoice_number,
                'status': invoice.status,
                'status_display': invoice.get_status_display(),
                'current_approver': {
                    'id': approver.id if approver else None,
                    'username': approver.username if approver else None,
                    'email': approver.email if approver else None,
                    'full_name': approver.get_full_name() if approver else None,
                    'position': approver.position if approver else None,
                    'is_active': approver.is_active if approver else None,
                } if approver else None,
                'current_step': {
                    'step_name': step.step_name if step else None,
                    'step_order': step.step_order if step else None,
                    'approver_position': step.approver_position if step else None,
                    'approver_user_id': step.approver_user.id if step and step.approver_user else None,
                    'approver_user_name': step.approver_user.get_full_name() if step and step.approver_user else None,
                } if step else None,
                'construction_site': {
                    'name': invoice.construction_site.name if invoice.construction_site else None,
                    'supervisor_id': invoice.construction_site.supervisor.id if invoice.construction_site and invoice.construction_site.supervisor else None,
                    'supervisor_name': invoice.construction_site.supervisor.get_full_name() if invoice.construction_site and invoice.construction_site.supervisor else None,
                } if invoice.construction_site else None
            }
            return Response(data)
        except Invoice.DoesNotExist:
            return Response({'error': f'Invoice {invoice_number} not found'}, status=404)
        except Exception as e:
            return Response({'error': str(e)}, status=500)

class DashboardViewSet(viewsets.GenericViewSet):
    """ダッシュボードAPI - ユーザー種別対応版"""
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        ユーザー種別に応じたダッシュボード統計を返す
        
        社内ユーザー: 全体統計
        協力会社ユーザー: 自社の統計のみ
        """
        from django.utils import timezone
        from datetime import timedelta
        
        user = request.user
        current_month = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        next_month = (current_month + timedelta(days=32)).replace(day=1)

        if user.user_type == 'internal':
            # 社内ユーザー向け統計
            stats = {
                'pending_invoices': Invoice.objects.filter(
                    status='pending_approval'
                ).count(),
                
                'my_pending_approvals': Invoice.objects.filter(
                    status='pending_approval',
                    current_approver=user
                ).count(),
                
                'monthly_payment': Invoice.objects.filter(
                    payment_due_date__gte=current_month,
                    payment_due_date__lt=next_month,
                    status__in=['approved', 'paid']
                ).aggregate(total=Sum('total_amount'))['total'] or 0,
                
                'partner_companies': CustomerCompany.objects.filter(
                    is_active=True
                ).count(),
            }
        else:
            # 協力会社ユーザー向け統計
            stats = {
                'draft_count': Invoice.objects.filter(
                    customer_company=user.customer_company,
                    status='draft'
                ).count(),
                
                'submitted_count': Invoice.objects.filter(
                    customer_company=user.customer_company,
                    status__in=['submitted', 'pending_approval']
                ).count(),
                
                'returned_count': Invoice.objects.filter(
                    customer_company=user.customer_company,
                    status='returned'
                ).count(),
                
                'approved_count': Invoice.objects.filter(
                    customer_company=user.customer_company,
                    status='approved'
                ).count(),
                
                'total_amount_pending': Invoice.objects.filter(
                    customer_company=user.customer_company,
                    status__in=['submitted', 'pending_approval', 'approved']
                ).aggregate(total=Sum('total_amount'))['total'] or 0,
            }

        return Response(stats, status=status.HTTP_200_OK)