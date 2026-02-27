// frontend/src/api/userRegistration.ts

import apiClient from './client';

export interface UserRegistrationRequest {
  id: number;
  company_name: string;
  company_name_kana?: string;
  full_name: string;
  email: string;
  phone_number: string;
  fax_number?: string;
  postal_code: string;
  address: string;
  representative_name?: string;
  invoice_registration_number?: string;
  head_office_address?: string;
  department?: string;
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
  full_name: string;
  email: string;
  confirm_email: string;
  phone_number: string;
  fax_number: string;
  postal_code: string;
  address: string;
  representative_name: string;
  invoice_registration_number: string;
  head_office_address: string;
  department?: string;
  position?: string;
  notes?: string;
  agree_terms: boolean;
}

export const userRegistrationAPI = {
  // 登録申請を送信
  register: async (data: RegistrationFormData): Promise<{ message: string; registration_id: number }> => {
    const response = await apiClient.post<{ message: string; registration_id: number }>(
      '/users/register/',
      {
        company_name: data.company_name,
        company_name_kana: data.company_name_kana || '',
        full_name: data.full_name,
        email: data.email,
        phone_number: data.phone_number,
        fax_number: data.fax_number || '',
        postal_code: data.postal_code,
        address: data.address,
        representative_name: data.representative_name || '',
        invoice_registration_number: data.invoice_registration_number || '',
        head_office_address: data.head_office_address || '',
        department: data.department || '',
        position: data.position || '',
        notes: data.notes || '',
      }
    );
    return response.data;
  },

  // 登録申請一覧取得（Admin/経理のみ）
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

  // 登録申請詳細取得
  getRequest: async (id: number): Promise<UserRegistrationRequest> => {
    const response = await apiClient.get<UserRegistrationRequest>(`/user-registration-requests/${id}/`);
    return response.data;
  },

  // 登録申請を承認
  approve: async (id: number): Promise<{ message: string; user_id: number; email: string }> => {
    const response = await apiClient.post<{ message: string; user_id: number; email: string }>(
      `/user-registration-requests/${id}/approve/`
    );
    return response.data;
  },

  // 登録申請を却下
  reject: async (id: number, rejection_reason: string): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>(
      `/user-registration-requests/${id}/reject/`,
      { rejection_reason }
    );
    return response.data;
  },
};

