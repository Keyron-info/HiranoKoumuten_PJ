import apiClient from './client';
import { User, AuthTokens, LoginForm, RegisterForm } from '../types';

export const authAPI = {
  // ログイン
  login: async (credentials: LoginForm): Promise<AuthTokens> => {
    const response = await apiClient.post<AuthTokens>('/auth/login/', credentials);
    const { access, refresh } = response.data;
    
    // トークンをローカルストレージに保存
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
    
    return response.data;
  },

  // ユーザー登録
  register: async (data: RegisterForm): Promise<User> => {
    const response = await apiClient.post<User>('/auth/register/', {
      username: data.username,
      email: data.email,
      password: data.password,
      first_name: data.first_name,
      last_name: data.last_name,
      company_name: data.company_name,
      phone_number: data.phone_number,
      user_type: 'customer', // 顧客ユーザーとして登録
      role: 'partner',
    });
    return response.data;
  },

  // プロフィール取得
  getProfile: async (): Promise<User> => {
    const response = await apiClient.get<User>('/auth/profile/');
    return response.data;
  },

  // プロフィール更新
  updateProfile: async (data: Partial<User>): Promise<User> => {
    const response = await apiClient.patch<User>('/auth/profile/', data);
    return response.data;
  },

  // ログアウト
  logout: (): void => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    window.location.href = '/login';
  },

  // 認証状態の確認
  isAuthenticated: (): boolean => {
    const token = localStorage.getItem('access_token');
    return !!token;
  },

  // トークンリフレッシュ
  refreshToken: async (): Promise<string> => {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }
    
    const response = await apiClient.post<{ access: string }>('/auth/token/refresh/', {
      refresh: refreshToken,
    });
    
    const newAccessToken = response.data.access;
    localStorage.setItem('access_token', newAccessToken);
    
    return newAccessToken;
  },
};