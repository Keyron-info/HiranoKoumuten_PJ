import apiClient from './client';
import {
  Invoice,
  InvoiceCreateForm,
  InvoiceComment,
  ConstructionSite,
  PaginatedResponse,
  DashboardStats,
} from '../types';

export const invoiceAPI = {
  // 請求書一覧取得
  getInvoices: async (params?: {
    status?: string;
    page?: number;
  }): Promise<PaginatedResponse<Invoice>> => {
    const response = await apiClient.get<PaginatedResponse<Invoice>>('/invoices/', {
      params,
    });
    return response.data;
  },

  // 請求書詳細取得
  getInvoice: async (id: string): Promise<Invoice> => {
    const response = await apiClient.get<Invoice>(`/invoices/${id}/`);
    return response.data;
  },

  // 請求書作成
  createInvoice: async (data: InvoiceCreateForm): Promise<Invoice> => {
    const response = await apiClient.post<Invoice>('/invoices/', data);
    return response.data;
  },

  // 請求書更新
  updateInvoice: async (id: string, data: Partial<InvoiceCreateForm>): Promise<Invoice> => {
    const response = await apiClient.patch<Invoice>(`/invoices/${id}/`, data);
    return response.data;
  },

  // 請求書削除
  deleteInvoice: async (id: string): Promise<void> => {
    await apiClient.delete(`/invoices/${id}/`);
  },

  // 請求書提出
  submitInvoice: async (id: string): Promise<Invoice> => {
    const response = await apiClient.post<Invoice>(`/invoices/${id}/submit/`);
    return response.data;
  },

  // 請求書承認
  approveInvoice: async (id: string, comment?: string): Promise<Invoice> => {
    const response = await apiClient.post<Invoice>(`/invoices/${id}/approve/`, {
      comment,
    });
    return response.data;
  },

  // 請求書却下
  rejectInvoice: async (id: string, comment: string): Promise<Invoice> => {
    const response = await apiClient.post<Invoice>(`/invoices/${id}/reject/`, {
      comment,
    });
    return response.data;
  },

  // 請求書差し戻し
  returnInvoice: async (id: string, comment: string): Promise<Invoice> => {
    const response = await apiClient.post<Invoice>(`/invoices/${id}/return/`, {
      comment,
    });
    return response.data;
  },

  // コメント追加
  addComment: async (
    id: string,
    comment: string,
    commentType: 'general' | 'approval' | 'payment' | 'correction' = 'general'
  ): Promise<InvoiceComment> => {
    const response = await apiClient.post<InvoiceComment>(`/invoices/${id}/comments/`, {
      comment,
      comment_type: commentType,
    });
    return response.data;
  },

  // 工事現場一覧取得
  getConstructionSites: async (): Promise<ConstructionSite[]> => {
    const response = await apiClient.get<ConstructionSite[]>('/construction-sites/');
    return response.data;
  },

  // ダッシュボード統計取得
  getDashboardStats: async (): Promise<DashboardStats> => {
    const response = await apiClient.get<DashboardStats>('/dashboard/stats/');
    return response.data;
  },
};