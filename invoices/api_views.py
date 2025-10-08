# invoices/api_views.py

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.views import TokenObtainPairView
from django.shortcuts import get_object_or_404
from django.db.models import Q

from .models import (
    Company, Department, CustomerCompany, User,
    Invoice, ApprovalRoute, ApprovalStep,
    ApprovalHistory, InvoiceComment
)
from .serializers import (
    CompanySerializer, DepartmentSerializer, CustomerCompanySerializer,
    UserSerializer, UserRegistrationSerializer,
    InvoiceSerializer, InvoiceCreateSerializer,
    ApprovalRouteSerializer, ApprovalStepSerializer,
    ApprovalHistorySerializer, InvoiceCommentSerializer
)


class IsCustomerUser(permissions.BasePermission):
    """顧客ユーザーかどうかをチェック"""
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
        """自分のプロフィール取得"""
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


class CustomerCompanyViewSet(viewsets.ReadOnlyModelViewSet):
    """顧客会社一覧API"""
    queryset = CustomerCompany.objects.filter(is_active=True)
    serializer_class = CustomerCompanySerializer
    permission_classes = [IsAuthenticated]


class CompanyViewSet(viewsets.ReadOnlyModelViewSet):
    """会社一覧API"""
    queryset = Company.objects.filter(is_active=True)
    serializer_class = CompanySerializer
    permission_classes = [IsAuthenticated]


class InvoiceViewSet(viewsets.ModelViewSet):
    """請求書API"""
    serializer_class = InvoiceSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """ユーザータイプに応じて請求書をフィルタリング"""
        user = self.request.user
        
        if user.user_type == 'customer':
            # 顧客ユーザーは自社の請求書のみ
            return Invoice.objects.filter(customer_company=user.customer_company)
        else:
            # 社内ユーザーは自社宛の請求書のみ
            return Invoice.objects.filter(receiving_company=user.company)
    
    def get_serializer_class(self):
        """作成時は専用シリアライザーを使用"""
        if self.action == 'create':
            return InvoiceCreateSerializer
        return InvoiceSerializer
    
    @action(detail=False, methods=['get'])
    def my_invoices(self, request):
        """自分の請求書一覧"""
        invoices = self.get_queryset()
        
        # ステータスでフィルタリング
        status_filter = request.query_params.get('status')
        if status_filter:
            invoices = invoices.filter(status=status_filter)
        
        # 検索
        search = request.query_params.get('search')
        if search:
            invoices = invoices.filter(
                Q(invoice_number__icontains=search) |
                Q(project_name__icontains=search) |
                Q(unique_number__icontains=search)
            )
        
        page = self.paginate_queryset(invoices)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(invoices, many=True)
        return Response(serializer.data)
    
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


class DashboardViewSet(viewsets.GenericViewSet):
    """ダッシュボードAPI"""
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """統計情報取得"""
        user = request.user
        
        if user.user_type == 'customer':
            invoices = Invoice.objects.filter(customer_company=user.customer_company)
        else:
            invoices = Invoice.objects.filter(receiving_company=user.company)
        
        # 統計計算
        total_count = invoices.count()
        pending_count = invoices.filter(status='pending_approval').count()
        approved_count = invoices.filter(status='approved').count()
        total_amount = sum(invoice.amount for invoice in invoices)
        
        return Response({
            'total_invoices': total_count,
            'pending_approval': pending_count,
            'approved_invoices': approved_count,
            'total_amount': float(total_amount),
            'recent_invoices': InvoiceSerializer(
                invoices.order_by('-created_at')[:5], 
                many=True
            ).data
        })