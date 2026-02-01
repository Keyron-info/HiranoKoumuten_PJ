import React, { useState, useEffect } from 'react';
import Layout from '../../components/common/Layout';
import { Users, Plus, Edit, Power, Search, Filter, X, AlertCircle, Check, Eye, EyeOff } from 'lucide-react';
import { usersAPI, UserData, CreateUserData } from '../../api/users';

const UserManagementPage: React.FC = () => {
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // フィルター
    const [filterUserType, setFilterUserType] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');

    // モーダル状態
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingUser, setEditingUser] = useState<UserData | null>(null);

    // フォームデータ
    const [formData, setFormData] = useState<CreateUserData>({
        username: '',
        password: '',
        email: '',
        first_name: '',
        last_name: '',
        user_type: 'internal',
        position: '',
        phone: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const data = await usersAPI.listAll({
                user_type: filterUserType || undefined,
                search: searchQuery || undefined,
            });
            setUsers(data);
            setError(null);
        } catch (err: any) {
            setError(err.response?.data?.error || 'ユーザー一覧の取得に失敗しました');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, [filterUserType]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchUsers();
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);

        try {
            await usersAPI.createUser(formData);
            setSuccess('ユーザーを作成しました');
            setShowCreateModal(false);
            setFormData({
                username: '',
                password: '',
                email: '',
                first_name: '',
                last_name: '',
                user_type: 'internal',
                position: '',
                phone: '',
            });
            fetchUsers();
        } catch (err: any) {
            setError(err.response?.data?.error || 'ユーザー作成に失敗しました');
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;

        setSubmitting(true);
        setError(null);

        try {
            await usersAPI.updateUser(editingUser.id, {
                email: formData.email,
                first_name: formData.first_name,
                last_name: formData.last_name,
                phone: formData.phone,
                position: formData.position,
                new_password: formData.password || undefined,
            });
            setSuccess('ユーザー情報を更新しました');
            setEditingUser(null);
            fetchUsers();
        } catch (err: any) {
            setError(err.response?.data?.error || 'ユーザー更新に失敗しました');
        } finally {
            setSubmitting(false);
        }
    };

    const handleToggleActive = async (userId: number) => {
        try {
            const result = await usersAPI.toggleActive(userId);
            setSuccess(result.message);
            fetchUsers();
        } catch (err: any) {
            setError(err.response?.data?.error || '状態の変更に失敗しました');
        }
    };

    const openEditModal = (user: UserData) => {
        setEditingUser(user);
        setFormData({
            username: user.username,
            password: '',
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            user_type: user.user_type,
            position: user.position,
            phone: user.phone,
        });
        setError(null);
    };

    const closeModal = () => {
        setShowCreateModal(false);
        setEditingUser(null);
        setFormData({
            username: '',
            password: '',
            email: '',
            first_name: '',
            last_name: '',
            user_type: 'internal',
            position: '',
            phone: '',
        });
        setError(null);
    };

    const positionOptions = [
        { value: 'admin', label: 'システム管理者' },
        { value: 'accountant', label: '経理担当' },
        { value: 'president', label: '代表取締役社長' },
        { value: 'senior_managing_director', label: '専務取締役' },
        { value: 'managing_director', label: '常務取締役' },
        { value: 'director', label: '取締役' },
        { value: 'manager', label: '部長' },
        { value: 'supervisor', label: '課長' },
        { value: 'site_supervisor', label: '現場監督' },
        { value: 'staff', label: '一般社員' },
    ];

    return (
        <Layout>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Users className="h-6 w-6 text-orange-600" />
                        ユーザー管理
                    </h1>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-4 py-2 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2"
                    >
                        <Plus className="h-5 w-5" />
                        新規ユーザー
                    </button>
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

                {error && !showCreateModal && !editingUser && (
                    <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
                        <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                        <span className="text-red-700">{error}</span>
                        <button onClick={() => setError(null)} className="ml-auto text-red-700 hover:text-red-900">
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                )}

                {/* フィルター */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
                    <div className="flex flex-wrap gap-4 items-end">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                <Filter className="h-4 w-4 inline mr-1" />
                                ユーザー種別
                            </label>
                            <select
                                value={filterUserType}
                                onChange={(e) => setFilterUserType(e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                            >
                                <option value="">すべて</option>
                                <option value="internal">社内ユーザー</option>
                                <option value="customer">協力会社</option>
                            </select>
                        </div>
                        <form onSubmit={handleSearch} className="flex-1 min-w-[200px]">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                <Search className="h-4 w-4 inline mr-1" />
                                検索
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="ユーザー名、氏名、メールアドレス"
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                />
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                                >
                                    検索
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* ユーザー一覧 */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    {loading ? (
                        <div className="p-8 text-center text-gray-500">読み込み中...</div>
                    ) : users.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">ユーザーが見つかりません</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ユーザー名</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">氏名</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">種別</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">役職/会社</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状態</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {users.map((user) => (
                                        <tr key={user.id} className={!user.is_active ? 'bg-gray-50 opacity-60' : ''}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">{user.username}</div>
                                                <div className="text-xs text-gray-500">{user.email}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {user.last_name} {user.first_name}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${user.user_type === 'internal'
                                                        ? 'bg-blue-100 text-blue-800'
                                                        : 'bg-green-100 text-green-800'
                                                    }`}>
                                                    {user.user_type_display}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {user.user_type === 'internal'
                                                    ? user.position_display
                                                    : user.customer_company_name}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${user.is_active
                                                        ? 'bg-green-100 text-green-800'
                                                        : 'bg-red-100 text-red-800'
                                                    }`}>
                                                    {user.is_active ? '有効' : '無効'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => openEditModal(user)}
                                                        className="p-1.5 text-gray-600 hover:text-orange-600 hover:bg-orange-50 rounded"
                                                        title="編集"
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleToggleActive(user.id)}
                                                        className={`p-1.5 rounded ${user.is_active
                                                                ? 'text-red-600 hover:bg-red-50'
                                                                : 'text-green-600 hover:bg-green-50'
                                                            }`}
                                                        title={user.is_active ? '無効化' : '有効化'}
                                                    >
                                                        <Power className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* 作成モーダル */}
                {showCreateModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
                            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                                <h2 className="text-xl font-bold text-gray-900">新規ユーザー作成</h2>
                                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                                    <X className="h-6 w-6" />
                                </button>
                            </div>
                            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
                                {error && (
                                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center">
                                        <AlertCircle className="h-4 w-4 mr-2" />
                                        {error}
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">ユーザー種別 *</label>
                                    <select
                                        value={formData.user_type}
                                        onChange={(e) => setFormData({ ...formData, user_type: e.target.value as 'internal' | 'customer' })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                        required
                                    >
                                        <option value="internal">社内ユーザー</option>
                                        <option value="customer">協力会社ユーザー</option>
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">姓</label>
                                        <input
                                            type="text"
                                            value={formData.last_name}
                                            onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">名</label>
                                        <input
                                            type="text"
                                            value={formData.first_name}
                                            onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">ユーザー名 *</label>
                                    <input
                                        type="text"
                                        value={formData.username}
                                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">メールアドレス</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">パスワード *</label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                            required
                                            minLength={8}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        >
                                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">8文字以上</p>
                                </div>

                                {formData.user_type === 'internal' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">役職</label>
                                        <select
                                            value={formData.position}
                                            onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                        >
                                            <option value="">選択してください</option>
                                            {positionOptions.map((opt) => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">電話番号</label>
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    />
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="flex-1 px-4 py-2 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 disabled:opacity-50"
                                    >
                                        {submitting ? '作成中...' : 'ユーザーを作成'}
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

                {/* 編集モーダル */}
                {editingUser && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
                            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                                <h2 className="text-xl font-bold text-gray-900">ユーザー編集</h2>
                                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                                    <X className="h-6 w-6" />
                                </button>
                            </div>
                            <form onSubmit={handleUpdateUser} className="p-6 space-y-4">
                                {error && (
                                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center">
                                        <AlertCircle className="h-4 w-4 mr-2" />
                                        {error}
                                    </div>
                                )}

                                <div className="p-3 bg-gray-50 rounded-lg">
                                    <div className="text-sm text-gray-600">ユーザー名: <span className="font-medium">{editingUser.username}</span></div>
                                    <div className="text-sm text-gray-600">種別: <span className="font-medium">{editingUser.user_type_display}</span></div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">姓</label>
                                        <input
                                            type="text"
                                            value={formData.last_name}
                                            onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">名</label>
                                        <input
                                            type="text"
                                            value={formData.first_name}
                                            onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">メールアドレス</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    />
                                </div>

                                {formData.user_type === 'internal' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">役職</label>
                                        <select
                                            value={formData.position}
                                            onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                        >
                                            <option value="">選択してください</option>
                                            {positionOptions.map((opt) => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">電話番号</label>
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">新しいパスワード（変更する場合のみ）</label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                            minLength={8}
                                            placeholder="空欄の場合は変更しません"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        >
                                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                        </button>
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

export default UserManagementPage;
