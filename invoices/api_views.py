# invoices/api_views.py

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.shortcuts import get_object_or_404
from django.db.models import Q, Sum

from .models import (
    Company, Department, CustomerCompany, User, ConstructionSite,
    Invoice, InvoiceItem, ApprovalRoute, ApprovalStep,
    ApprovalHistory, InvoiceComment
)
from .serializers import (
    CompanySerializer, DepartmentSerializer, CustomerCompanySerializer,
    UserSerializer, UserRegistrationSerializer,
    InvoiceSerializer, InvoiceCreateSerializer,
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
    
    def get_queryset(self):
        """ユーザーに応じた工事現場を返す"""
        user = self.request.user
        queryset = ConstructionSite.objects.filter(is_active=True)
        
        # 必要に応じてフィルタリング
        # if user.user_type == 'customer':
        #     queryset = queryset.filter(company=user.company)
        
        return queryset


class InvoiceViewSet(viewsets.ModelViewSet):
    """請求書API"""
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        """作成時は専用シリアライザーを使用"""
        if self.action == 'create':
            return InvoiceCreateSerializer
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
        
        # 検索
        search = self.request.query_params.get('search')
        if search:
            invoices = invoices.filter(
                Q(invoice_number__icontains=search) |
                Q(project_name__icontains=search) |
                Q(construction_site_name__icontains=search)
            )
        
        return invoices.order_by('-created_at')
    
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
        """請求書を提出"""
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
        
        # ステータスを変更
        invoice.status = 'submitted'
        invoice.save()
        
        # 提出履歴を記録
        ApprovalHistory.objects.create(
            invoice=invoice,
            user=request.user,
            action='submitted',
            comment='請求書を提出しました'
        )
        
        return Response({
            'message': '請求書を提出しました',
            'invoice': InvoiceSerializer(invoice).data
        })
    
    @action(detail=True, methods=['post'], permission_classes=[IsInternalUser])
    def approve(self, request, pk=None):
        """請求書承認"""
        invoice = self.get_object()
        comment = request.data.get('comment', '')
        
        # ステータス更新
        invoice.status = 'approved'
        invoice.save()
        
        # 承認履歴追加
        ApprovalHistory.objects.create(
            invoice=invoice,
            user=request.user,
            action='approved',
            comment=comment
        )
        
        return Response({
            'message': '請求書を承認しました',
            'invoice': InvoiceSerializer(invoice).data
        })
    
    @action(detail=True, methods=['post'], permission_classes=[IsInternalUser])
    def reject(self, request, pk=None):
        """請求書却下"""
        invoice = self.get_object()
        comment = request.data.get('comment', '')
        
        if not comment:
            return Response(
                {'error': '却下理由を入力してください'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # ステータス更新
        invoice.status = 'rejected'
        invoice.save()
        
        # 承認履歴追加
        ApprovalHistory.objects.create(
            invoice=invoice,
            user=request.user,
            action='rejected',
            comment=comment
        )
        
        return Response({
            'message': '請求書を却下しました',
            'invoice': InvoiceSerializer(invoice).data
        })
    
    @action(detail=True, methods=['post'], permission_classes=[IsInternalUser])
    def return_invoice(self, request, pk=None):
        """請求書差し戻し"""
        invoice = self.get_object()
        comment = request.data.get('comment', '')
        
        if not comment:
            return Response(
                {'error': '差し戻し理由を入力してください'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # ステータス更新
        invoice.status = 'returned'
        invoice.save()
        
        # 承認履歴追加
        ApprovalHistory.objects.create(
            invoice=invoice,
            user=request.user,
            action='returned',
            comment=comment
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
        
        serializer = InvoiceCommentSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(invoice=invoice, user=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ============================================================
# backend/invoices/api_views.py の DashboardViewSet を
# 以下のコードで置き換えてください
# ============================================================

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
                    status__in=['submitted', 'in_approval']
                ).count(),
                
                'pending_approvals': Invoice.objects.filter(
                    status='in_approval',
                    # current_approver=user  # 承認ルート実装時に有効化
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
                    status__in=['submitted', 'in_approval']
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
                    status__in=['submitted', 'in_approval', 'approved']
                ).aggregate(total=Sum('total_amount'))['total'] or 0,
            }

        return Response(stats, status=status.HTTP_200_OK)