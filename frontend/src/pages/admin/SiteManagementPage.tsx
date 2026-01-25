import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/common/Layout';
import { useAuth } from '../../contexts/AuthContext';
import { constructionSiteAPI, invoiceAPI } from '../../api/invoices';
import { ConstructionSite } from '../../types';

const SiteManagementPage: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [sites, setSites] = useState<ConstructionSite[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingSite, setEditingSite] = useState<ConstructionSite | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        location: '',
        site_password: '',
        is_active: true,
    });

    useEffect(() => {
        if (user?.user_type !== 'internal') {
            navigate('/dashboard');
            return;
        }
        fetchSites();
    }, [user, navigate]);

    const fetchSites = async () => {
        try {
            setLoading(true);
            const data = await constructionSiteAPI.getSites(true); // include completed
            setSites(data);
        } catch (error) {
            console.error('Failed to fetch sites', error);
            alert('工事現場の取得に失敗しました');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (site?: ConstructionSite) => {
        if (site) {
            setEditingSite(site);
            setFormData({
                name: site.name,
                location: site.location,
                site_password: site.site_password || '',
                is_active: site.is_active,
            });
        } else {
            setEditingSite(null);
            setFormData({
                name: '',
                location: '',
                site_password: '',
                is_active: true,
            });
        }
        setShowModal(true);
    };

    const generatePassword = () => {
        // 簡易的なランダムパスワード生成 (英数字8桁)
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let password = '';
        for (let i = 0; i < 8; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setFormData(prev => ({ ...prev, site_password: password }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // API call to create or update (Note: Assuming we have create/update API in constructionSiteAPI or standard model viewset)
            // Since constructionSiteAPI in invoices.ts might not have generic create/update exposed cleanly or needs update.
            // We will use apiClient directly if needed, or better, update invoices.ts to support update.
            // For now, assuming standard REST endpoints: POST /construction-sites/ or PATCH /construction-sites/:id/

            // Let's check invoices.ts. It has updateBudget but not generic update. 
            // I should have checked checks before writing. I will assume I can add it or use a generic approach.
            // Wait, I can use a direct axios call or update the API file. I'll stick to a generic approach here for now 
            // but to be safe I'll use a wrapper.

            // Actually, let's implement the logic assuming the API exists or I will add it.
            // Looking at invoices.ts, I don't see `createSite` or `updateSite`. I should add them.
            // But I can't do that inside this WriteFile.
            // I'll write the fetch logic here to use a helper function I'll define in this file or imports.
            // Or I can use `apiClient` if I import it? No, apiClient is not exported from invoices.ts usually.
            // I'll import apiClient from '../../api/client' if possible.

            // Since I can't easily change imports in one go without errors,
            // I will assume I will add `createSite` and `updateSite` to `constructionSiteAPI` in `invoices.ts` in the next step.

            if (editingSite) {
                await constructionSiteAPI.updateSite(editingSite.id, formData); // Need to implement this
            } else {
                await constructionSiteAPI.createSite(formData); // Need to implement this
            }

            setShowModal(false);
            fetchSites();
            alert(editingSite ? '更新しました' : '作成しました');
        } catch (error) {
            console.error('Save failed', error);
            alert('保存に失敗しました');
        }
    };

    if (loading) return <Layout><div className="p-8 text-center">読み込み中...</div></Layout>;

    return (
        <Layout>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">工事現場管理</h1>
                    <button
                        onClick={() => handleOpenModal()}
                        className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition"
                    >
                        + 新規現場登録
                    </button>
                </div>

                <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">現場名</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">場所</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">パスワード</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">担当監督</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状態</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {sites.map((site) => (
                                <tr key={site.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{site.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{site.location}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                                        {site.site_password ? (
                                            <span className="bg-gray-100 px-2 py-1 rounded border overflow-hidden text-ellipsis max-w-[100px] inline-block align-middle">
                                                {site.site_password}
                                            </span>
                                        ) : (
                                            <span className="text-gray-300">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{site.supervisor_name || '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${site.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {site.is_active ? '有効' : '無効'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button onClick={() => handleOpenModal(site)} className="text-indigo-600 hover:text-indigo-900">編集</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                    <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowModal(false)} />

                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                            <div>
                                <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                                    {editingSite ? '現場情報の編集' : '新規現場登録'}
                                </h3>
                                <div className="mt-4 space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">現場名</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">場所</label>
                                        <textarea
                                            value={formData.location}
                                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">現場パスワード</label>
                                        <div className="mt-1 flex rounded-md shadow-sm">
                                            <input
                                                type="text"
                                                value={formData.site_password}
                                                onChange={(e) => setFormData({ ...formData, site_password: e.target.value })}
                                                placeholder="パスワードを入力"
                                                className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-l-md border border-gray-300 focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                                            />
                                            <button
                                                type="button"
                                                onClick={generatePassword}
                                                className="-ml-px relative inline-flex items-center space-x-2 px-4 py-2 border border-gray-300 text-sm font-medium rounded-r-md text-gray-700 bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                                            >
                                                自動生成
                                            </button>
                                        </div>
                                        <p className="mt-1 text-xs text-gray-500">協力会社に共有するパスワードです。</p>
                                    </div>

                                    <div className="flex items-center">
                                        <input
                                            id="is_active"
                                            type="checkbox"
                                            checked={formData.is_active}
                                            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                            className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                                        />
                                        <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                                            有効（一覧に表示）
                                        </label>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                                <button
                                    type="button"
                                    onClick={handleSubmit}
                                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-orange-600 text-base font-medium text-white hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 sm:col-start-2 sm:text-sm"
                                >
                                    保存
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 sm:mt-0 sm:col-start-1 sm:text-sm"
                                >
                                    キャンセル
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default SiteManagementPage;
