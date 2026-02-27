// frontend/src/pages/admin/ConstructionTypeManagementPage.tsx
// 工種マスタ管理ページ（社内ユーザー専用）

import React, { useState, useEffect } from 'react';
import Layout from '../../components/common/Layout';
import { constructionTypeAPI } from '../../api/invoices';
import { ConstructionType } from '../../types';

const ConstructionTypeManagementPage: React.FC = () => {
    const [types, setTypes] = useState<ConstructionType[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // 新規/編集フォーム
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        description: '',
        display_order: 0,
    });

    useEffect(() => {
        fetchTypes();
    }, []);

    const fetchTypes = async () => {
        try {
            const data = await constructionTypeAPI.getTypes();
            setTypes(data);
        } catch (error) {
            console.error('工種取得エラー:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await constructionTypeAPI.create(formData);
            alert('工種を追加しました');
            setShowAddForm(false);
            setFormData({ code: '', name: '', description: '', display_order: 0 });
            fetchTypes();
        } catch (error: any) {
            alert('追加エラー: ' + (error.response?.data?.code?.[0] || error.response?.data?.detail || error.message));
        }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingId) return;
        try {
            await constructionTypeAPI.update(editingId, formData);
            alert('工種を更新しました');
            setEditingId(null);
            setFormData({ code: '', name: '', description: '', display_order: 0 });
            fetchTypes();
        } catch (error: any) {
            alert('更新エラー: ' + (error.response?.data?.detail || error.message));
        }
    };

    const handleDeactivate = async (id: number, name: string) => {
        if (!window.confirm(`「${name}」を無効にしますか？\n（請求書作成時の選択肢から非表示になります）`)) return;
        try {
            await constructionTypeAPI.deactivate(id);
            alert('工種を無効にしました');
            fetchTypes();
        } catch (error: any) {
            alert('エラー: ' + (error.response?.data?.detail || error.message));
        }
    };

    const startEdit = (type: ConstructionType) => {
        setEditingId(type.id);
        setFormData({
            code: type.code,
            name: type.name,
            description: type.description || '',
            display_order: type.display_order || 0,
        });
        setShowAddForm(false);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setShowAddForm(false);
        setFormData({ code: '', name: '', description: '', display_order: 0 });
    };

    const filteredTypes = types.filter(
        (t) =>
            t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <Layout>
                <div className="flex justify-center items-center h-64">
                    <div className="text-gray-500">読み込み中...</div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* ヘッダー */}
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">工種マスタ管理</h1>
                        <p className="text-sm text-gray-500 mt-1">
                            登録済み: {types.length}件
                        </p>
                    </div>
                    <button
                        onClick={() => {
                            setShowAddForm(true);
                            setEditingId(null);
                            setFormData({ code: '', name: '', description: '', display_order: types.length + 1 });
                        }}
                        className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition"
                    >
                        + 工種追加
                    </button>
                </div>

                {/* 検索 */}
                <div className="mb-4">
                    <input
                        type="text"
                        placeholder="工種名またはコードで検索..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                </div>

                {/* 追加/編集フォーム */}
                {(showAddForm || editingId) && (
                    <div className="bg-white shadow rounded-lg p-6 mb-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">
                            {editingId ? '工種を編集' : '新しい工種を追加'}
                        </h3>
                        <form onSubmit={editingId ? handleUpdate : handleAdd} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    工種コード <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.code}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                    placeholder="例: exterior_wall"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    工種名 <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="例: 外壁工事"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">説明</label>
                                <input
                                    type="text"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="説明（任意）"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">表示順</label>
                                <input
                                    type="number"
                                    value={formData.display_order}
                                    onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                />
                            </div>
                            <div className="md:col-span-2 flex gap-3">
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
                                >
                                    {editingId ? '更新' : '追加'}
                                </button>
                                <button
                                    type="button"
                                    onClick={cancelEdit}
                                    className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                                >
                                    キャンセル
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* 工種一覧テーブル */}
                <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">コード</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">工種名</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">説明</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">使用回数</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">表示順</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">アクション</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredTypes.map((type) => (
                                <tr key={type.id} className={`hover:bg-gray-50 ${editingId === type.id ? 'bg-yellow-50' : ''}`}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <code className="text-xs bg-gray-100 px-2 py-1 rounded">{type.code}</code>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="text-sm font-medium text-gray-900">{type.name}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-sm text-gray-500">{type.description || '-'}</span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <span className={`text-sm ${type.usage_count > 0 ? 'text-primary-600 font-medium' : 'text-gray-400'}`}>
                                            {type.usage_count}回
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <span className="text-sm text-gray-500">{type.display_order}</span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <button
                                            onClick={() => startEdit(type)}
                                            className="text-indigo-600 hover:text-indigo-900 mr-3"
                                        >
                                            編集
                                        </button>
                                        <button
                                            onClick={() => handleDeactivate(type.id, type.name)}
                                            className="text-red-600 hover:text-red-900"
                                        >
                                            無効化
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filteredTypes.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                                        {searchTerm ? '該当する工種が見つかりません' : '工種が登録されていません'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </Layout>
    );
};

export default ConstructionTypeManagementPage;
