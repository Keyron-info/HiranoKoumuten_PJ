import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

// APIベースURL（開発環境）
const normalizeApiBaseUrl = (value?: string): string => {
  if (!value) {
    return `${window.location.origin}/api`;
  }

  const trimmed = value.replace(/\/+$/, '');
  if (trimmed.endsWith('/api')) {
    return trimmed;
  }
  return `${trimmed}/api`;
};

const API_BASE_URL = normalizeApiBaseUrl(process.env.REACT_APP_API_URL);

// Axiosインスタンスの作成
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30秒
});

// リクエストインターセプター（JWTトークンの自動付与）
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// レスポンスインターセプター（トークン更新処理）
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // 401エラー（認証エラー）の場合、トークンを更新
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          // リフレッシュトークンで新しいアクセストークンを取得
          const response = await axios.post(`${API_BASE_URL}/token/refresh/`, {
            refresh: refreshToken,
          });

          const newAccessToken = response.data.access;
          localStorage.setItem('access_token', newAccessToken);

          // 元のリクエストを再実行
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          }
          return apiClient(originalRequest);
        } catch (refreshError) {
          // リフレッシュトークンも無効な場合、ログアウト
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      } else {
        // リフレッシュトークンがない場合、ログアウト
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;