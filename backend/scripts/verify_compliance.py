import os
import sys
import django
from django.utils import timezone
from datetime import timedelta

# Setup Django Environment
sys.path.append('/Volumes/TOSHIBA EXT/KEYRON/開発/平野工務店PJ_コード')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'keyron_project.settings')
django.setup()

from rest_framework.test import APIRequestFactory, force_authenticate
from invoices.api_views import InvoiceViewSet
from invoices.models import Invoice, ConstructionSite, CustomerCompany, Company
from django.contrib.auth import get_user_model

User = get_user_model()

def verify_compliance():
    print("--- Starting Compliance Search Verification ---")
    
    # 1. Setup Data
    # Ensure Company exists
    company_owner, _ = Company.objects.get_or_create(name='Hirano Koumuten', defaults={'is_active': True})

    user, created = User.objects.get_or_create(username='compliance_tester', defaults={'user_type': 'internal', 'position': 'accountant', 'company': company_owner})
    if not created:
         user.company = company_owner
         user.save()
    
    # Assign company to ConstructionSite
    site, _ = ConstructionSite.objects.get_or_create(name='Test Site', defaults={'company': company_owner})
    if not site.company:
        site.company = company_owner
        site.save()

    company, _ = CustomerCompany.objects.get_or_create(name='Test Company')
    
    # Create Invoices
    today = timezone.now().date()
    
    # Invoice A: Today, 100,000 JPY
    inv_a = Invoice.objects.create(
        invoice_number='INV-A',
        invoice_date=today,
        total_amount=100000,
        construction_site=site,
        customer_company=company,
        receiving_company=company_owner,
        created_by=user,
        status='approved'
    )
    
    # Invoice B: 10 days ago, 500,000 JPY
    inv_b = Invoice.objects.create(
        invoice_number='INV-B',
        invoice_date=today - timedelta(days=10),
        total_amount=500000,
        construction_site=site,
        customer_company=company,
        receiving_company=company_owner,
        created_by=user,
        status='approved'
    )
    
    # Invoice C: 20 days ago, 1,000,000 JPY
    inv_c = Invoice.objects.create(
        invoice_number='INV-C',
        invoice_date=today - timedelta(days=20),
        total_amount=1000000,
        construction_site=site,
        customer_company=company,
        receiving_company=company_owner,
        created_by=user,
        status='approved'
    )
    
    print("Created 3 Test Invoices.")
    
    factory = APIRequestFactory()
    view = InvoiceViewSet.as_view({'get': 'list'})
    
    # 2. Test Date Range (Last 15 days)
    # Should find A (Today) and B (10 days ago), but not C (20 days ago)
    date_from = (today - timedelta(days=15)).isoformat()
    date_to = today.isoformat()
    
    print(f"Testing Date Range: {date_from} ~ {date_to}")
    request = factory.get('/api/invoices/', {'date_from': date_from, 'date_to': date_to})
    force_authenticate(request, user=user)
    response = view(request)
    
    ids = [i['id'] for i in response.data['results']] if 'results' in response.data else [i['id'] for i in response.data]
    print(f"Result IDs: {ids}")
    
    if inv_a.id in ids and inv_b.id in ids and inv_c.id not in ids:
        print("✅ Date Range Test Passed")
    else:
        print("❌ Date Range Test Failed")
        
    # 3. Test Amount Range (400,000 - 600,000)
    # Should find B (500,000) only
    print(f"Testing Amount Range: 400,000 ~ 600,000")
    request = factory.get('/api/invoices/', {'min_amount': 400000, 'max_amount': 600000})
    force_authenticate(request, user=user)
    response = view(request)
    
    ids = [i['id'] for i in response.data['results']] if 'results' in response.data else [i['id'] for i in response.data]
    print(f"Result IDs: {ids}")
    
    if inv_b.id in ids and inv_a.id not in ids and inv_c.id not in ids:
        print("✅ Amount Range Test Passed")
    else:
        print("❌ Amount Range Test Failed")
        
    # Cleanup
    inv_a.delete()
    inv_b.delete()
    inv_c.delete()
    # Don't delete user/site/company to avoid cascading issues if they existed before

if __name__ == "__main__":
    verify_compliance()
