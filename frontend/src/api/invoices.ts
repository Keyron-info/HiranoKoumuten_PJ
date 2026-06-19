// frontend/src/api/invoices.ts

import apiClient from './client';
import {
  Invoice,
  InvoiceListItem,
  InvoiceCreateForm,
  InvoiceComment,
  ConstructionSite,
  PaginatedResponse,
  DashboardStats,
  ConstructionType,
  PurchaseOrder,
  SystemNotification,
  InvoiceChangeHistory,
  SitePaymentSummary,
  AlertSite,
  AmountVerificationResult,
  InvoiceDetail,
  ConstructionSiteDetail,
} from '../types';

// ダッシュボード用の型定義
export interface CurrentPeriod {
  period_name: string;
  deadline_date: string;
  is_closed: boolean;
}

export interface RecentInvoice {
  id: number;
  invoice_number: string;
  customer_company_name: string;
  total_amount: string;
  status_display: string;
  created_at: string;
}

export const invoiceAPI = {
  // 請求書一覧取得
  getInvoices: async (params?: {
    status?: string;
    page?: number;
    search?: string;
    date_from?: string;
    date_to?: string;
    min_amount?: number;
    max_amount?: number;
    site?: number;
    company?: number;
  }): Promise<PaginatedResponse<InvoiceListItem>> => {
    const response = await apiClient.get<PaginatedResponse<InvoiceListItem>>('/invoices/', {
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

  // PDF添付ファイルアップロード
  uploadAttachment: async (id: string | number, formData: FormData): Promise<{ message: string; attachment: { id: number; file_name: string; file_type: string } }> => {
    const response = await apiClient.post(`/invoices/${id}/upload_attachment/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  // 協力会社確認（常務承認後）
  partnerConfirm: async (id: string | number): Promise<{ message: string }> => {
    const response = await apiClient.post(`/invoices/${id}/partner_confirm/`);
    return response.data;
  },

  // 現場所長による差し戻し再提出
  supervisorResubmit: async (id: string | number, comment?: string): Promise<{ message: string }> => {
    const response = await apiClient.post(`/invoices/${id}/supervisor_resubmit/`, { comment: comment || '' });
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


  // 特例パスワードの検証
  verifySpecialPassword: async (id: string, password: string): Promise<{ valid: boolean; error?: string; message?: string }> => {
    const response = await apiClient.post<{ valid: boolean; error?: string; message?: string }>(
      `/invoices/${id}/verify_special_password/`,
      { special_password: password }
    );
    return response.data;
  },

  // 請求書提出（特例パスワード対応）
  submitInvoice: async (id: string, specialPassword?: string): Promise<{ message: string; invoice: Invoice }> => {
    const response = await apiClient.post<{ message: string; invoice: Invoice }>(
      `/invoices/${id}/submit/`,
      specialPassword ? { special_password: specialPassword } : {}
    );
    return response.data;
  },

  // 請求書承認
  approveInvoice: async (id: string, comment?: string): Promise<{ message: string; invoice: Invoice }> => {
    const response = await apiClient.post<{ message: string; invoice: Invoice }>(
      `/invoices/${id}/approve/`,
      { comment }
    );
    return response.data;
  },

  // 請求書却下
  rejectInvoice: async (id: string, comment: string): Promise<{ message: string; invoice: Invoice }> => {
    const response = await apiClient.post<{ message: string; invoice: Invoice }>(
      `/invoices/${id}/reject/`,
      { comment }
    );
    return response.data;
  },

  // 請求書差し戻し
  returnInvoice: async (id: string, comment: string): Promise<{ message: string; invoice: Invoice }> => {
    const response = await apiClient.post<{ message: string; invoice: Invoice }>(
      `/invoices/${id}/return_invoice/`,
      { comment }
    );
    return response.data;
  },

  // 🆕 Phase 5: 追加要件API

  // 自分の承認待ち一覧
  getMyPendingApprovals: async (): Promise<{ count: number; results: InvoiceListItem[] }> => {
    const response = await apiClient.get<{ count: number; results: InvoiceListItem[] }>(
      '/invoices/my_pending_approvals/'
    );
    return response.data;
  },

  // PDF権限チェック
  checkPdfPermission: async (id: string): Promise<{ can_download: boolean; reason: string }> => {
    const response = await apiClient.get<{ can_download: boolean; reason: string }>(
      `/invoices/${id}/pdf_permission/`
    );
    return response.data;
  },

  // PDFダウンロード（権限チェック付き）
  downloadPdf: async (id: string): Promise<{ message: string; invoice_id: number; invoice_number: string }> => {
    const response = await apiClient.get<{ message: string; invoice_id: number; invoice_number: string }>(
      `/invoices/${id}/download_pdf/`
    );
    return response.data;
  },

  // 協力会社への差し戻し（編集不可モード）
  returnToPartner: async (id: string, comment: string): Promise<{ message: string; invoice: any }> => {
    const response = await apiClient.post<{ message: string; invoice: any }>(
      `/invoices/${id}/return_to_partner/`,
      { comment }
    );
    return response.data;
  },

  // 修正一覧取得
  getCorrections: async (id: string): Promise<{ count: number; pending_approval: number; results: any[] }> => {
    const response = await apiClient.get<{ count: number; pending_approval: number; results: any[] }>(
      `/invoices/${id}/corrections/`
    );
    return response.data;
  },

  // 赤ペン修正を追加
  addCorrection: async (id: string, data: {
    invoice_item?: number;
    field_name: string;
    field_type: string;
    original_value: string;
    corrected_value: string;
    correction_reason: string;
  }): Promise<{ message: string; correction: any }> => {
    const response = await apiClient.post<{ message: string; correction: any }>(
      `/invoices/${id}/add_correction/`,
      data
    );
    return response.data;
  },

  // 協力会社が修正を承認
  approveCorrections: async (id: string): Promise<{ message: string; invoice: any }> => {
    const response = await apiClient.post<{ message: string; invoice: any }>(
      `/invoices/${id}/approve_corrections/`
    );
    return response.data;
  },

  // 協力会社向けビュー取得
  getPartnerView: async (id: string): Promise<any> => {
    const response = await apiClient.get<any>(`/invoices/${id}/partner_view/`);
    return response.data;
  },

  // 🆕 差し戻し承認（協力会社のみ）
  acknowledgeReturn: async (id: string): Promise<{ message: string; invoice_id: number; new_status: string; invoice: any }> => {
    const response = await apiClient.post<{ message: string; invoice_id: number; new_status: string; invoice: any }>(
      `/invoices/${id}/acknowledge/`
    );
    return response.data;
  },

  // 🆕 Phase 6: 一括承認API

  // 一括承認
  // 一括承認
  bulkApprove: async (invoiceIds: number[], comment: string = '一括承認'): Promise<{
    message: string;
    success_count: number;
    failure_count: number;
    errors: Array<{ id: number; invoice_number: string; error: string }>;
  }> => {
    const response = await apiClient.post('/invoices/bulk_approve/', {
      invoice_ids: invoiceIds,
      comment,
    });
    return response.data;
  },

  // 一括却下
  batchReject: async (invoiceIds: number[], comment: string): Promise<{
    message: string;
    rejected_count: number;
  }> => {
    const response = await apiClient.post('/invoices/batch_reject/', {
      invoice_ids: invoiceIds,
      comment,
    });
    return response.data;
  },

  // コメント一覧取得
  getComments: async (id: string): Promise<InvoiceComment[]> => {
    const response = await apiClient.get<InvoiceComment[]>(`/invoices/${id}/comments/`);
    return response.data;
  },

  // コメント追加
  addComment: async (
    id: string,
    comment: string,
    commentType: 'general' | 'approval' | 'payment' | 'correction' | 'internal_memo' = 'general',
    isPrivate: boolean = false
  ): Promise<InvoiceComment> => {
    const response = await apiClient.post<InvoiceComment>(`/invoices/${id}/add_comment/`, {
      comment,
      comment_type: commentType,
      is_private: isPrivate,
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

  // 🆕 Phase 6: ダッシュボード強化API

  // 現場別リスクヒートマップ
  getSiteHeatmap: async (): Promise<{
    heatmap: Array<{
      site_id: number;
      site_name: string;
      supervisor: string | null;
      budget: number;
      invoiced: number;
      consumption_rate: number;
      risk_level: 'critical' | 'high' | 'medium' | 'low';
      risk_color: string;
      is_cutoff: boolean;
    }>;
    summary: {
      total_sites: number;
      critical_count: number;
      high_count: number;
      medium_count: number;
      low_count: number;
    };
  }> => {
    const response = await apiClient.get('/dashboard/site_heatmap/');
    return response.data;
  },

  // 月次推移グラフ用データ
  getMonthlyTrend: async (): Promise<{
    trends: Array<{
      year: number;
      month: number;
      label: string;
      total_amount: number;
      invoice_count: number;
    }>;
    average: number;
  }> => {
    const response = await apiClient.get('/dashboard/monthly_trend/');
    return response.data;
  },

  // 承認進捗バー用データ
  getApprovalProgress: async (): Promise<Array<{
    role: string;
    name: string;
    pending: number;
    completed: number;
  }>> => {
    const response = await apiClient.get('/dashboard/approval_progress/');
    return response.data;
  },

  // 🆕 当月請求期間取得
  getCurrentPeriod: async (): Promise<CurrentPeriod | null> => {
    try {
      const response = await apiClient.get<CurrentPeriod>('/invoice-periods/current/');
      return response.data;
    } catch (error) {
      console.log('当月期間なし');
      return null;
    }
  },

  // 🆕 最近の請求書取得（ダッシュボード用）
  getRecentInvoices: async (limit: number = 5): Promise<RecentInvoice[]> => {
    try {
      const response = await apiClient.get<PaginatedResponse<RecentInvoice> | RecentInvoice[]>('/invoices/', {
        params: { page_size: limit, ordering: '-created_at' },
      });
      // PaginatedResponseの場合とそうでない場合を処理
      const data = Array.isArray(response.data) ? response.data : response.data.results;
      return data || [];
    } catch (error) {
      console.log('最近の請求書取得失敗');
      return [];
    }
  },

  // ==========================================
  // Phase 3: 新規API
  // ==========================================

  // 請求書詳細（拡張版）
  getInvoiceDetail: async (id: string): Promise<InvoiceDetail> => {
    const response = await apiClient.get<InvoiceDetail>(`/invoices/${id}/`);
    return response.data;
  },

  // 訂正機能
  correctInvoice: async (id: string, data: { change_reason: string; items?: any[] }): Promise<{ message: string; invoice: InvoiceDetail }> => {
    const response = await apiClient.post<{ message: string; invoice: InvoiceDetail }>(`/invoices/${id}/correct/`, data);
    return response.data;
  },

  // 金額照合
  verifyAmount: async (id: string): Promise<AmountVerificationResult> => {
    const response = await apiClient.get<AmountVerificationResult>(`/invoices/${id}/verify_amount/`);
    return response.data;
  },

  // 変更履歴取得
  getChangeHistory: async (id: string): Promise<InvoiceChangeHistory[]> => {
    const response = await apiClient.get<InvoiceChangeHistory[]>(`/invoices/${id}/change_history/`);
    return response.data;
  },

  // 受領処理
  setReceived: async (id: string): Promise<{ message: string; received_at: string; correction_deadline: string }> => {
    const response = await apiClient.post<{ message: string; received_at: string; correction_deadline: string }>(`/invoices/${id}/set_received/`);
    return response.data;
  },

  // 安全衛生協力会費通知
  notifySafetyFee: async (id: string): Promise<{ message: string; fee: number; net_amount: number }> => {
    const response = await apiClient.post<{ message: string; fee: number; net_amount: number }>(`/invoices/${id}/notify_safety_fee/`);
    return response.data;
  },

  // 🆕 前回入力値を取得（入力支援機能）
  getLastInput: async (): Promise<{
    has_previous: boolean;
    construction_site?: number;
    construction_type?: number;
    construction_type_other?: string;
    project_name?: string;
    notes?: string;
    last_invoice_number?: string;
    last_created_at?: string;
    message?: string;
  }> => {
    try {
      const response = await apiClient.get('/invoices/last_input/');
      return response.data;
    } catch (error) {
      return { has_previous: false };
    }
  },

  // 🆕 よく使う明細項目を取得
  getFrequentItems: async (): Promise<{ frequent_items: { description: string; count: number }[] }> => {
    try {
      const response = await apiClient.get('/invoices/frequent_items/');
      return response.data;
    } catch (error) {
      return { frequent_items: [] };
    }
  },

  // 🆕 メンション可能なユーザー一覧を取得
  getMentionableUsers: async (): Promise<{
    users: { id: number; username: string; display_name: string; position: string }[]
  }> => {
    try {
      const response = await apiClient.get('/invoices/mentionable_users/');
      return response.data;
    } catch (error) {
      return { users: [] };
    }
  },
};

// 工種API
export const constructionTypeAPI = {
  // 工種一覧取得
  getTypes: async (): Promise<ConstructionType[]> => {
    const response = await apiClient.get<ConstructionType[] | { results: ConstructionType[] }>('/construction-types/');
    // ページネーション対応
    if (Array.isArray(response.data)) {
      return response.data;
    } else if (response.data && 'results' in response.data) {
      return response.data.results;
    }
    return [];
  },

  // よく使う工種取得
  getPopularTypes: async (): Promise<ConstructionType[]> => {
    const response = await apiClient.get<ConstructionType[] | { results: ConstructionType[] }>('/construction-types/popular/');
    if (Array.isArray(response.data)) {
      return response.data;
    } else if (response.data && 'results' in response.data) {
      return response.data.results;
    }
    return [];
  },

  // 工種マスタ初期化
  initialize: async (): Promise<{ message: string; total: number }> => {
    const response = await apiClient.post<{ message: string; total: number }>('/construction-types/initialize/');
    return response.data;
  },

  // 工種作成
  create: async (data: { code: string; name: string; description?: string; display_order?: number }): Promise<ConstructionType> => {
    const response = await apiClient.post<ConstructionType>('/construction-types/', data);
    return response.data;
  },

  // 工種更新
  update: async (id: number, data: Partial<{ code: string; name: string; description: string; display_order: number; is_active: boolean }>): Promise<ConstructionType> => {
    const response = await apiClient.patch<ConstructionType>(`/construction-types/${id}/`, data);
    return response.data;
  },

  // 工種削除（論理削除: is_active=false）
  deactivate: async (id: number): Promise<ConstructionType> => {
    const response = await apiClient.patch<ConstructionType>(`/construction-types/${id}/`, { is_active: false });
    return response.data;
  },
};

// 注文書API
export const purchaseOrderAPI = {
  // 注文書一覧取得
  getOrders: async (params?: { construction_site?: string; status?: string }): Promise<PurchaseOrder[]> => {
    try {
      const response = await apiClient.get<PurchaseOrder[] | { results: PurchaseOrder[] }>('/purchase-orders/', { params });
      if (Array.isArray(response.data)) {
        return response.data;
      } else if (response.data && 'results' in response.data) {
        return response.data.results;
      }
      return [];
    } catch (error) {
      console.log('注文書取得失敗:', error);
      return [];
    }
  },

  // 注文書詳細取得
  getOrder: async (id: string): Promise<PurchaseOrder> => {
    const response = await apiClient.get<PurchaseOrder>(`/purchase-orders/${id}/`);
    return response.data;
  },

  // 注文書作成
  createOrder: async (data: Partial<PurchaseOrder>): Promise<PurchaseOrder> => {
    const response = await apiClient.post<PurchaseOrder>('/purchase-orders/', data);
    return response.data;
  },

  // 紐付き請求書取得
  getLinkedInvoices: async (id: string): Promise<{ order_number: string; order_amount: number; invoiced_amount: number; remaining_amount: number; invoices: InvoiceListItem[] }> => {
    const response = await apiClient.get(`/purchase-orders/${id}/linked_invoices/`);
    return response.data;
  },
};

// 工事現場API（拡張）
export const constructionSiteAPI = {
  // 工事現場一覧取得
  getSites: async (includeCompleted = false): Promise<ConstructionSite[]> => {
    const response = await apiClient.get<ConstructionSite[] | { results: ConstructionSite[] }>('/construction-sites/', {
      params: { include_completed: includeCompleted ? 'true' : 'false' }
    });
    // ページネーション対応
    if (Array.isArray(response.data)) {
      return response.data;
    } else if (response.data && 'results' in response.data) {
      return response.data.results;
    }
    return [];
  },

  // 現場パスワード検証
  verifyPassword: async (password: string): Promise<ConstructionSiteDetail> => {
    const response = await apiClient.post<ConstructionSiteDetail>('/construction-sites/verify_password/', { password });
    return response.data;
  },

  // 工事現場詳細取得
  getSite: async (id: string): Promise<ConstructionSiteDetail> => {
    const response = await apiClient.get<ConstructionSiteDetail>(`/construction-sites/${id}/`);
    return response.data;
  },

  // 現場完成処理
  markComplete: async (id: string): Promise<{ message: string; site: ConstructionSiteDetail }> => {
    const response = await apiClient.post<{ message: string; site: ConstructionSiteDetail }>(`/construction-sites/${id}/mark_complete/`);
    return response.data;
  },

  // 予算サマリー取得
  getBudgetSummary: async (id: string): Promise<{
    site_name: string;
    total_budget: number;
    total_invoiced: number;
    consumption_rate: number;
    is_exceeded: boolean;
    is_alert: boolean;
    alert_threshold: number;
    invoice_count: number;
    remaining_budget: number;
  }> => {
    const response = await apiClient.get(`/construction-sites/${id}/budget_summary/`);
    return response.data;
  },

  // 予算更新
  updateBudget: async (id: string, data: { total_budget?: number; budget_alert_threshold?: number }): Promise<{ message: string; site: ConstructionSiteDetail }> => {
    const response = await apiClient.patch(`/construction-sites/${id}/update_budget/`, data);
    return response.data;
  },

  // 🆕 Phase 6: 打ち切り機能

  // 打ち切り処理
  cutoff: async (id: string, reason: string): Promise<{ message: string; site: ConstructionSiteDetail }> => {
    const response = await apiClient.post(`/construction-sites/${id}/cutoff/`, { reason });
    return response.data;
  },

  // 打ち切り解除（スーパー管理者のみ）
  reactivate: async (id: string): Promise<{ message: string; site: ConstructionSiteDetail }> => {
    const response = await apiClient.post(`/construction-sites/${id}/reactivate/`);
    return response.data;
  },

  // 現場作成
  createSite: async (data: any): Promise<ConstructionSite> => {
    const response = await apiClient.post<ConstructionSite>('/construction-sites/', data);
    return response.data;
  },

  // 現場更新
  updateSite: async (id: string, data: any): Promise<ConstructionSite> => {
    const response = await apiClient.patch<ConstructionSite>(`/construction-sites/${id}/`, data);
    return response.data;
  },

  // 請求書作成可否チェック
  canCreateInvoice: async (id: string): Promise<{
    can_create: boolean;
    error_message: string | null;
    site_id: number;
    site_name: string;
    is_cutoff: boolean;
    is_completed: boolean;
    is_active: boolean;
  }> => {
    const response = await apiClient.get(`/construction-sites/${id}/can_create_invoice/`);
    return response.data;
  },
};

// 通知API
export const notificationAPI = {
  // 通知一覧取得
  getNotifications: async (): Promise<SystemNotification[]> => {
    const response = await apiClient.get<SystemNotification[]>('/notifications/');
    return response.data;
  },

  // 未読通知取得
  getUnread: async (): Promise<{ count: number; notifications: SystemNotification[] }> => {
    const response = await apiClient.get<{ count: number; notifications: SystemNotification[] }>('/notifications/unread/');
    return response.data;
  },

  // 既読にする
  markRead: async (id: number): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>(`/notifications/${id}/mark_read/`);
    return response.data;
  },

  // 全て既読にする
  markAllRead: async (): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>('/notifications/mark_all_read/');
    return response.data;
  },
};

// レポートAPI
export const reportAPI = {
  // 現場別支払い集計（円グラフ用）
  getSitePaymentSummary: async (): Promise<{ grand_total: number; sites: SitePaymentSummary[] }> => {
    const response = await apiClient.get('/reports/site_payment_summary/');
    return response.data;
  },

  // 月別業者別集計
  getMonthlyCompanySummary: async (year?: number, month?: number): Promise<any[]> => {
    const response = await apiClient.get('/reports/monthly_company_summary/', {
      params: { year, month }
    });
    return response.data;
  },

  // アラート現場一覧
  getAlertSites: async (): Promise<{ count: number; sites: AlertSite[] }> => {
    const response = await apiClient.get<{ count: number; sites: AlertSite[] }>('/reports/alert_sites/');
    return response.data;
  },

  // CSV出力URL生成
  getCsvExportUrl: (year: number, month?: number, type: 'monthly' | 'company' | 'site' = 'monthly'): string => {
    let url = `/api/reports/csv_export/?year=${year}&type=${type}`;
    if (month) url += `&month=${month}`;
    return url;
  },
};

// 請求書期間API
export const invoicePeriodAPI = {
  // 期間一覧取得
  getPeriods: async (): Promise<any[]> => {
    const response = await apiClient.get('/invoice-periods/');
    return response.data.results || response.data;
  },

  // 当月期間取得
  getCurrentPeriod: async (): Promise<any> => {
    try {
      const response = await apiClient.get('/invoice-periods/current/');
      return response.data;
    } catch (error) {
      console.log('当月期間なし');
      return null;
    }
  },

  // 期間作成
  createPeriod: async (data: { year: number; month: number; deadline_date: string }): Promise<any> => {
    const response = await apiClient.post('/invoice-periods/', data);
    return response.data;
  },

  // 期間締め処理
  closePeriod: async (id: number): Promise<any> => {
    const response = await apiClient.post(`/invoice-periods/${id}/close/`);
    return response.data;
  },
};

// ==========================================
// Phase 6: 追加機能API
// ==========================================

// CSV出力API
export const csvExportAPI = {
  // 請求書一覧CSV
  getInvoicesUrl: (params?: { status?: string; year?: number; month?: number; site?: number; company?: number }): string => {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.year) query.append('year', params.year.toString());
    if (params?.month) query.append('month', params.month.toString());
    if (params?.site) query.append('site', params.site.toString());
    if (params?.company) query.append('company', params.company.toString());
    return `/api/csv-export/invoices/?${query.toString()}`;
  },

  // 月別集計CSV
  getMonthlySummaryUrl: (year: number, month?: number): string => {
    const query = new URLSearchParams({ year: year.toString() });
    if (month) query.append('month', month.toString());
    return `/api/csv-export/monthly_summary/?${query.toString()}`;
  },

  // 業者別集計CSV
  getCompanySummaryUrl: (year: number, month?: number): string => {
    const query = new URLSearchParams({ year: year.toString() });
    if (month) query.append('month', month.toString());
    return `/api/csv-export/company_summary/?${query.toString()}`;
  },

  // 現場別集計CSV
  getSiteSummaryUrl: (year: number, month?: number): string => {
    const query = new URLSearchParams({ year: year.toString() });
    if (month) query.append('month', month.toString());
    return `/api/csv-export/site_summary/?${query.toString()}`;
  },
};

// チャートデータAPI
export const chartDataAPI = {
  // 現場別支払い割合（円グラフ用）
  getSitePaymentSummary: async (): Promise<{
    total: number;
    sites: Array<{
      site_id: number;
      site_name: string;
      amount: number;
      percentage: number;
      budget: number;
      consumption_rate: number;
      is_alert: boolean;
      alert_reason: string | null;
    }>;
  }> => {
    const response = await apiClient.get('/chart-data/site_payment_summary/');
    return response.data;
  },

  // 月別推移データ
  getMonthlyTrend: async (year: number): Promise<Array<{
    month: number;
    total_amount: number;
    invoice_count: number;
  }>> => {
    const response = await apiClient.get('/chart-data/monthly_trend/', {
      params: { year }
    });
    return response.data;
  },

  // アラート現場一覧
  getAlertSites: async (): Promise<{
    count: number;
    sites: Array<{
      id: number;
      name: string;
      budget: number;
      invoiced: number;
      consumption_rate: number;
      is_exceeded: boolean;
      supervisor: string | null;
    }>;
  }> => {
    const response = await apiClient.get('/chart-data/alert_sites/');
    return response.data;
  },
};

// 安全衛生協力会費API
export const safetyFeeAPI = {
  // 協力会費計算
  calculate: async (amount: number): Promise<{
    base_amount: string;
    fee_rate: string;
    fee_amount: string;
    net_amount: string;
    threshold: number;
  }> => {
    const response = await apiClient.get('/safety-fee/calculate/', {
      params: { amount }
    });
    return response.data;
  },

  // 協力会費通知送信
  notify: async (invoiceId: number): Promise<{ message: string }> => {
    const response = await apiClient.post('/safety-fee/notify/', { invoice_id: invoiceId });
    return response.data;
  },
};

// 金額照合API
export const amountVerificationAPI = {
  // 請求書金額を照合
  verify: async (invoiceId: number): Promise<{
    verified: boolean;
    status: string;
    difference: number;
    message: string;
    auto_approve: boolean;
    requires_additional_approval?: boolean;
  }> => {
    const response = await apiClient.get('/amount-verification/verify/', {
      params: { invoice_id: invoiceId }
    });
    return response.data;
  },

  // 上乗せのある請求書一覧
  getOverAmountInvoices: async (): Promise<{
    count: number;
    invoices: Array<{
      id: number;
      invoice_number: string;
      customer_company: string;
      invoice_amount: number;
      order_amount: number;
      difference: number;
      status: string;
    }>;
  }> => {
    const response = await apiClient.get('/amount-verification/over_amount_invoices/');
    return response.data;
  },
};

// 予算アラートAPI
export const budgetAlertAPI = {
  // 特定現場の予算アラートチェック
  checkSite: async (siteId: number): Promise<{
    site_id: number;
    site_name: string;
    budget: number;
    invoiced: number;
    consumption_rate: number;
    alerts: Array<{
      threshold: number;
      rate: number;
      message: string;
    }>;
  }> => {
    const response = await apiClient.get('/budget-alerts/check_site/', {
      params: { site_id: siteId }
    });
    return response.data;
  },

  // 予算アラート送信
  sendAlerts: async (siteId: number): Promise<{
    message: string;
    alerts?: number[];
  }> => {
    const response = await apiClient.post('/budget-alerts/send_alerts/', { site_id: siteId });
    return response.data;
  },
};

// コメントメンションAPI
export const commentMentionAPI = {
  // メンション可能なユーザー一覧
  getMentionableUsers: async (): Promise<{
    users: Array<{
      id: number;
      username: string;
      display_name: string;
      position: string;
      user_type: string;
    }>;
  }> => {
    const response = await apiClient.get('/comment-mentions/mentionable_users/');
    return response.data;
  },

  // メンション解析・通知
  parseAndNotify: async (commentId: number): Promise<{
    message: string;
    mentioned_users: string[];
  }> => {
    const response = await apiClient.post('/comment-mentions/parse_and_notify/', { comment_id: commentId });
    return response.data;
  },
};

// 月次締めAPI
export const monthlyClosingAPI = {
  // 提出可否チェック
  checkSubmission: async (invoiceId: number): Promise<{
    can_submit: boolean;
    reason: string;
  }> => {
    const response = await apiClient.get('/monthly-closing/check_submission/', {
      params: { invoice_id: invoiceId }
    });
    return response.data;
  },

  // 訂正可否チェック
  checkCorrection: async (invoiceId: number): Promise<{
    can_correct: boolean;
    reason: string;
    correction_deadline: string | null;
  }> => {
    const response = await apiClient.get('/monthly-closing/check_correction/', {
      params: { invoice_id: invoiceId }
    });
    return response.data;
  },

  // 期間締め
  closePeriod: async (periodId: number): Promise<{ message: string }> => {
    const response = await apiClient.post('/monthly-closing/close_period/', { period_id: periodId });
    return response.data;
  },
};

// 監査ログAPI
export const auditLogAPI = {
  // ログ一覧取得
  getLogs: async (params?: {
    action?: string;
    user_id?: number;
    resource_type?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<any[]> => {
    const response = await apiClient.get('/audit-logs/', { params });
    return response.data;
  },

  // サマリー取得
  getSummary: async (): Promise<{
    today_count: number;
    action_summary: Array<{ action: string; count: number }>;
    user_summary: Array<{ user__username: string; user__first_name: string; user__last_name: string; count: number }>;
  }> => {
    const response = await apiClient.get('/audit-logs/summary/');
    return response.data;
  },
};