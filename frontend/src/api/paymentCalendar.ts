// frontend/src/api/paymentCalendar.ts

import apiClient from './client';

export interface CalendarMonth {
  id: number;
  year: number;
  month: number;
  payment_date: string;
  deadline_date: string;
  is_holiday_period: boolean;
  holiday_note: string;
  is_non_standard_deadline: boolean;
}

export interface DeadlineBanner {
  id: number;
  target_year: number;
  target_month: number;
  display_message: string;
  message_template?: string;
  period_name?: string;
  custom_message?: string;
  is_active: boolean;
}

export const paymentCalendarAPI = {
  // 今年のカレンダー取得
  getCurrentYear: async (): Promise<CalendarMonth[]> => {
    const response = await apiClient.get<CalendarMonth[]>('/payment-calendar/current_year/');
    return response.data;
  },

  // カレンダー一覧取得
  getCalendars: async (): Promise<CalendarMonth[]> => {
    const response = await apiClient.get<CalendarMonth[] | { results: CalendarMonth[] }>('/payment-calendar/');
    if (Array.isArray(response.data)) {
      return response.data;
    } else if (response.data && 'results' in response.data) {
      return response.data.results;
    }
    return [];
  },

  // カレンダー作成
  createCalendar: async (data: Partial<CalendarMonth>): Promise<CalendarMonth> => {
    const response = await apiClient.post<CalendarMonth>('/payment-calendar/', data);
    return response.data;
  },

  // カレンダー更新
  updateCalendar: async (id: number, data: Partial<CalendarMonth>): Promise<CalendarMonth> => {
    const response = await apiClient.put<CalendarMonth>(`/payment-calendar/${id}/`, data);
    return response.data;
  },

  // アクティブなバナー取得
  getActiveBanner: async (): Promise<DeadlineBanner | null> => {
    try {
      const response = await apiClient.get<DeadlineBanner>('/deadline-banner/active/');
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  // バナー一覧取得
  getBanners: async (): Promise<DeadlineBanner[]> => {
    const response = await apiClient.get<DeadlineBanner[] | { results: DeadlineBanner[] }>('/deadline-banner/');
    if (Array.isArray(response.data)) {
      return response.data;
    } else if (response.data && 'results' in response.data) {
      return response.data.results;
    }
    return [];
  },

  // バナー詳細取得
  getBanner: async (id: number): Promise<DeadlineBanner> => {
    const response = await apiClient.get<DeadlineBanner>(`/deadline-banner/${id}/`);
    return response.data;
  },

  // バナー作成
  createBanner: async (data: Partial<DeadlineBanner>): Promise<DeadlineBanner> => {
    const response = await apiClient.post<DeadlineBanner>('/deadline-banner/', data);
    return response.data;
  },

  // バナー更新
  updateBanner: async (id: number, data: Partial<DeadlineBanner>): Promise<DeadlineBanner> => {
    const response = await apiClient.put<DeadlineBanner>(`/deadline-banner/${id}/`, data);
    return response.data;
  },

  // バナー削除
  deleteBanner: async (id: number): Promise<void> => {
    await apiClient.delete(`/deadline-banner/${id}/`);
  },
};

