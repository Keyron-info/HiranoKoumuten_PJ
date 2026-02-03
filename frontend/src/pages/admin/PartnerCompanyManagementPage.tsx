import React, { useState, useEffect } from 'react';
import Layout from '../../components/common/Layout';
import { Building2, Edit, X, Check, AlertCircle, Search } from 'lucide-react';
import { partnerCompanyAPI, PartnerCompany, PartnerCompanyUpdate } from '../../api/partnerCompany';

const PartnerCompanyManagementPage: React.FC = () => {
    const [companies, setCompanies] = useState<PartnerCompany[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [editingCompany, setEditingCompany] = useState<PartnerCompany | null>(null);
    const [formData, setFormData] = useState<PartnerCompanyUpdate>({});
    const [submitting, setSubmitting] = useState(false);

    const fetchCompanies = async () => {
        try {
            setLoading(true);
            const data = await partnerCompanyAPI.getAll();
            setCompanies(data);
            setError(null);
        } catch (err: any) {
            setError('協力会社一覧の取得に失敗しました');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCompanies();
    }, []);

    const filteredCompanies = companies.filter(company =>
        company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        company.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const openEditModal = (company: PartnerCompany) => {
        setEditingCompany(company);
        setFormData({
            name: company.name,
            postal_code: company.postal_code,
            address: company.address,
            phone: company.phone,
            email: company.email,
            bank_name: company.bank_name,
            bank_branch: company.bank_branch,
            bank_account: company.bank_account,
        });
        setError(null);
    };

    const closeModal = () => {
        setEditingCompany(null);
        setFormData({});
        setError(null);
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingCompany) return;

        setSubmitting(true);
        setError(null);

        try {
            await partnerCompanyAPI.update(editingCompany.id, formData);
            setSuccess('協力会社情報を更新しました');
            closeModal();
            fetchCompanies();
        } catch (err: any) {
            setError(err.response?.data?.error || '更新に失敗しました');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Layout>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Building2 className="h-6 w-6 text-primary-600" />
                        協力会社管理
                    </h1>
                </div>

                {/* 通知 */}
                {success && (
                    <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center">
                        <Check className="h-5 w-5 text-green-500 mr-2" />
                        <span className="text-green-700">{success}</span>
                        <button onClick={() => setSuccess(null)} className="ml-auto text-green-700 hover:text-green-900">
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                )}

                {error && !editingCompany && (
                    <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
                        <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                        <span className="text-red-700">{error}</span>
                        <button onClick={() => setError(null)} className="ml-auto text-red-700 hover:text-red-900">
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                )}

                {/* 検索 */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
                    <div className="flex items-center gap-2">
                        <Search className="h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="会社名またはメールアドレスで検索"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                    </div>
                </div>

                {/* 会社一覧 */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    {loading ? (
                        <div className="p-8 text-center text-gray-500">読み込み中...</div>
                    ) : filteredCompanies.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">協力会社が見つかりません</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">会社名</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">連絡先</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">銀行情報</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状態</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredCompanies.map((company) => (
                                        <tr key={company.id} className={!company.is_active ? 'bg-gray-50 opacity-60' : ''}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">{company.name}</div>
                                                <div className="text-xs text-gray-500">{company.business_type_display}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900">{company.email || '-'}</div>
                                                <div className="text-xs text-gray-500">{company.phone || '-'}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900">{company.bank_name || '-'}</div>
                                                <div className="text-xs text-gray-500">
                                                    {company.bank_branch ? `${company.bank_branch} / ${company.bank_account || '-'}` : '-'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${company.is_active
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-red-100 text-red-800'
                                                    }`}>
                                                    {company.is_active ? '有効' : '無効'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <button
                                                    onClick={() => openEditModal(company)}
                                                    className="p-1.5 text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded"
                                                    title="編集"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* 編集モーダル */}
                {editingCompany && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
                            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                                <h2 className="text-xl font-bold text-gray-900">協力会社情報編集</h2>
                                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                                    <X className="h-6 w-6" />
                                </button>
                            </div>
                            <form onSubmit={handleUpdate} className="p-6 space-y-4">
                                {error && (
                                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center">
                                        <AlertCircle className="h-4 w-4 mr-2" />
                                        {error}
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">会社名</label>
                                    <input
                                        type="text"
                                        value={formData.name || ''}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">郵便番号</label>
                                        <input
                                            type="text"
                                            value={formData.postal_code || ''}
                                            onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">電話番号</label>
                                        <input
                                            type="tel"
                                            value={formData.phone || ''}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">住所</label>
                                    <input
                                        type="text"
                                        value={formData.address || ''}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">メールアドレス</label>
                                    <input
                                        type="email"
                                        value={formData.email || ''}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    />
                                </div>

                                <div className="border-t border-gray-200 pt-4">
                                    <h3 className="text-sm font-medium text-gray-900 mb-3">銀行情報</h3>
                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">銀行名</label>
                                            <input
                                                type="text"
                                                value={formData.bank_name || ''}
                                                onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">支店名</label>
                                                <input
                                                    type="text"
                                                    value={formData.bank_branch || ''}
                                                    onChange={(e) => setFormData({ ...formData, bank_branch: e.target.value })}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">口座番号</label>
                                                <input
                                                    type="text"
                                                    value={formData.bank_account || ''}
                                                    onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="flex-1 px-4 py-2 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 disabled:opacity-50"
                                    >
                                        {submitting ? '更新中...' : '更新'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={closeModal}
                                        className="px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200"
                                    >
                                        キャンセル
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default PartnerCompanyManagementPage;
