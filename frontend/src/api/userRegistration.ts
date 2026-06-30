// frontend/src/api/userRegistration.ts

import apiClient from './client';

export interface UserRegistrationRequest {
  id: number;
  company_name: string;
  company_name_kana?: string;
  full_name?: string;
  email: string;
  invoice_email?: string;
  phone_number: string;
  fax_number?: string;
  postal_code: string;
  address?: string;
  head_office_address?: string;
  branch_office_address?: string;
  representative_name?: string;
  invoice_registration_number?: string;
  department?: string;
  contact_department?: string;
  contact_position?: string;
  contact_person?: string;
  accounting_contact?: string;
  main_construction_type?: string;
  position?: string;
  notes?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  status_display: string;
  submitted_at: string;
  reviewed_at?: string;
  reviewed_by?: number;
  reviewed_by_name?: string;
  rejection_reason?: string;
  created_user?: number;
}

export interface RegistrationFormData {
  company_name: string;
  company_name_kana: string;
  department: string;
  postal_code: string;
  head_office_address: string;
  branch_office_address: string;
  email: string;
  invoice_email: string;
  phone_number: string;
  fax_number: string;
  contact_department: string;
  contact_position: string;
  contact_person: string;
  accounting_contact: string;
  main_construction_type: string;
  bank_name: string;
  bank_branch: string;
  bank_account_type: string;
  bank_account_number: string;
  bank_account_holder: string;
  bank_account_holder_kana: string;
  invoice_registration_number: string;
  agree_terms: boolean;
}

export const userRegistrationAPI = {
  register: async (data: RegistrationFormData): Promise<{ message: string; registration_id: number }> => {
    const response = await apiClient.post<{ message: string; registration_id: number }>(
      '/users/register/',
      {
        company_name: data.company_name,
        company_name_kana: data.company_name_kana || '',
        department: data.department || '',
        postal_code: data.postal_code,
        head_office_address: data.head_office_address,
        branch_office_address: data.branch_office_address || '',
        email: data.email,
        invoice_email: data.invoice_email || '',
        phone_number: data.phone_number,
        fax_number: data.fax_number || '',
        contact_department: data.contact_department || '',
        contact_position: data.contact_position || '',
        contact_person: data.contact_person || '',
        accounting_contact: data.accounting_contact || '',
        main_construction_type: data.main_construction_type || '',
        bank_name: data.bank_name,
        bank_branch: data.bank_branch,
        bank_account_type: data.bank_account_type || 'ordinary',
        bank_account_number: data.bank_account_number,
        bank_account_holder: data.bank_account_holder,
        bank_account_holder_kana: data.bank_account_holder_kana,
        invoice_registration_number: data.invoice_registration_number || '',
      }
    );
    return response.data;
  },

  getRequests: async (): Promise<UserRegistrationRequest[]> => {
    const response = await apiClient.get<UserRegistrationRequest[] | { results: UserRegistrationRequest[] }>(
      '/user-registration-requests/'
    );
    if (Array.isArray(response.data)) {
      return response.data;
    } else if (response.data && 'results' in response.data) {
      return response.data.results;
    }
    return [];
  },

  getRequest: async (id: number): Promise<UserRegistrationRequest> => {
    const response = await apiClient.get<UserRegistrationRequest>(`/user-registration-requests/${id}/`);
    return response.data;
  },

  approve: async (id: number): Promise<{ message: string; user_id: number; email: string }> => {
    const response = await apiClient.post<{ message: string; user_id: number; email: string }>(
      `/user-registration-requests/${id}/approve/`
    );
    return response.data;
  },

  reject: async (id: number, rejection_reason: string): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>(
      `/user-registration-requests/${id}/reject/`,
      { rejection_reason }
    );
    return response.data;
  },
};
