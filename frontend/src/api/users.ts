// frontend/src/api/users.ts

import apiClient from './client';

export interface ChangePasswordData {
    current_password: string;
    new_password: string;
    new_password_confirm: string;
}

export interface UserData {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    user_type: 'internal' | 'customer';
    user_type_display: string;
    position: string;
    position_display: string;
    company: number | null;
    company_name: string | null;
    customer_company: number | null;
    customer_company_name: string | null;
    phone: string;
    is_active_user: boolean;
    is_active?: boolean;
    date_joined: string;
}

export interface CreateUserData {
    username: string;
    password: string;
    email?: string;
    first_name?: string;
    last_name?: string;
    user_type: 'internal' | 'customer';
    position?: string;
    phone?: string;
    customer_company?: number;
    company?: number;
}

export interface UpdateUserData {
    email?: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
    position?: string;
    customer_company?: number;
    new_password?: string;
}

export const usersAPI = {
    // パスワード変更
    changePassword: async (data: ChangePasswordData): Promise<{ message: string }> => {
        const response = await apiClient.post<{ message: string }>(
            '/users/change_password/',
            data
        );
        return response.data;
    },

    // ユーザー一覧取得（管理者のみ）
    listAll: async (params?: {
        user_type?: string;
        is_active?: string;
        search?: string;
    }): Promise<UserData[]> => {
        const response = await apiClient.get<UserData[]>('/users/list_all/', { params });
        return response.data;
    },

    // ユーザー作成（管理者のみ）
    createUser: async (data: CreateUserData): Promise<UserData> => {
        const response = await apiClient.post<UserData>('/users/create_user/', data);
        return response.data;
    },

    // ユーザー編集（管理者のみ）
    updateUser: async (userId: number, data: UpdateUserData): Promise<UserData> => {
        const response = await apiClient.patch<UserData>(`/users/${userId}/update_user/`, data);
        return response.data;
    },

    // ユーザー有効/無効切り替え（管理者のみ）
    toggleActive: async (userId: number): Promise<{ message: string; user: UserData }> => {
        const response = await apiClient.post<{ message: string; user: UserData }>(
            `/users/${userId}/toggle_active/`
        );
        return response.data;
    },
};
