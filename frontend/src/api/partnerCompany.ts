// frontend/src/api/partnerCompany.ts

import apiClient from './client';

export interface PartnerCompany {
    id: number;
    name: string;
    business_type: string;
    business_type_display: string;
    postal_code: string;
    address: string;
    phone: string;
    email: string;
    tax_number: string;
    bank_name: string;
    bank_branch: string;
    bank_account: string;
    is_active: boolean;
}

export interface PartnerCompanyUpdate {
    name?: string;
    postal_code?: string;
    address?: string;
    phone?: string;
    email?: string;
    tax_number?: string;
    bank_name?: string;
    bank_branch?: string;
    bank_account?: string;
    is_active?: boolean;
}

export const partnerCompanyAPI = {
    // 協力会社一覧取得
    getAll: async (): Promise<PartnerCompany[]> => {
        const response = await apiClient.get<PartnerCompany[] | { results: PartnerCompany[] }>('/customer-companies/');
        if (Array.isArray(response.data)) {
            return response.data;
        } else if (response.data && 'results' in response.data) {
            return response.data.results;
        }
        return [];
    },

    // 協力会社詳細取得
    get: async (id: number): Promise<PartnerCompany> => {
        const response = await apiClient.get<PartnerCompany>(`/customer-companies/${id}/`);
        return response.data;
    },

    // 協力会社更新
    update: async (id: number, data: PartnerCompanyUpdate): Promise<PartnerCompany> => {
        const response = await apiClient.patch<PartnerCompany>(`/customer-companies/${id}/`, data);
        return response.data;
    },
};
