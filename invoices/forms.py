# invoices/forms.py

from django import forms
from .models import Invoice, CustomerCompany, Company

class InvoiceUploadForm(forms.ModelForm):
    class Meta:
        model = Invoice
        fields = [
            'invoice_number', 'customer_company', 'receiving_company', 
            'amount', 'tax_amount', 'issue_date', 'due_date', 
            'project_name', 'project_code', 'department_code', 'file'
        ]
        widgets = {
            'issue_date': forms.DateInput(attrs={'type': 'date'}),
            'due_date': forms.DateInput(attrs={'type': 'date'}),
            'amount': forms.NumberInput(attrs={'step': '0.01'}),
            'tax_amount': forms.NumberInput(attrs={'step': '0.01'}),
        }
    
    def __init__(self, *args, **kwargs):
        user = kwargs.pop('user', None)
        super().__init__(*args, **kwargs)
        
        # ユーザーが顧客の場合、customer_companyを固定
        if user and user.user_type == 'customer':
            self.fields['customer_company'].initial = user.customer_company
            self.fields['customer_company'].widget = forms.HiddenInput()
            
        # ユーザーが社内の場合、receiving_companyを固定
        if user and user.user_type == 'internal':
            self.fields['receiving_company'].initial = user.company
            self.fields['receiving_company'].widget = forms.HiddenInput()