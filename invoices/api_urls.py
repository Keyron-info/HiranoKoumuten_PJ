# invoices/api_urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .api_views import (
    UserRegistrationViewSet,
    UserProfileViewSet,
    CustomerCompanyViewSet,
    CompanyViewSet,
    ConstructionSiteViewSet,
    InvoiceViewSet,
    DashboardViewSet,
)

router = DefaultRouter()
router.register(r'customer-companies', CustomerCompanyViewSet, basename='customer-company')
router.register(r'companies', CompanyViewSet, basename='company')
router.register(r'construction-sites', ConstructionSiteViewSet, basename='construction-site')
router.register(r'invoices', InvoiceViewSet, basename='invoice')
router.register(r'dashboard', DashboardViewSet, basename='dashboard')
router.register(r'users', UserProfileViewSet, basename='user')

urlpatterns = [
    # JWT認証
    path('auth/login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # ユーザー登録
    path('auth/register/', UserRegistrationViewSet.as_view({'post': 'register'}), name='register'),
    
    # Router URLs
    path('', include(router.urls)),
]