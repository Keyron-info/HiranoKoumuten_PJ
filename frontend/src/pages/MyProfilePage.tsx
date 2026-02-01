import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/common/Layout';
import { User, Building, Mail, Shield, Briefcase, Lock, Eye, EyeOff, Check, AlertCircle } from 'lucide-react';
import { usersAPI } from '../api/users';

const MyProfilePage: React.FC = () => {
    const { user } = useAuth();
    const [showPasswordForm, setShowPasswordForm] = useState(false);
    const [passwordData, setPasswordData] = useState({
        current_password: '',
        new_password: '',
        new_password_confirm: '',
    });
    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false,
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    if (!user) {
        return (
            <Layout>
                <div className="flex justify-center items-center h-64">
                    <p className="text-gray-500">ログインしてください</p>
                </div>
            </Layout>
        );
    }

    const getRoleDisplayName = (role: string) => {
        const roles: { [key: string]: string } = {
            'admin': '管理者',
            'internal': '社内ユーザー',
            'customer': '協力会社',
        };
        return roles[role] || role;
    };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        // クライアント側バリデーション
        if (passwordData.new_password !== passwordData.new_password_confirm) {
            setError('新しいパスワードが一致しません');
            return;
        }

        if (passwordData.new_password.length < 8) {
            setError('パスワードは8文字以上で入力してください');
            return;
        }

        setIsSubmitting(true);

        try {
            await usersAPI.changePassword(passwordData);
            setSuccess('パスワードを変更しました');
            setPasswordData({
                current_password: '',
                new_password: '',
                new_password_confirm: '',
            });
            setShowPasswordForm(false);
        } catch (err: any) {
            setError(err.response?.data?.error || 'パスワードの変更に失敗しました');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Layout>
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-6">マイページ</h1>

                {/* 成功メッセージ */}
                {success && (
                    <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4">
                        <div className="flex items-center">
                            <Check className="h-5 w-5 text-green-400 mr-2" />
                            <p className="text-sm text-green-700">{success}</p>
                        </div>
                    </div>
                )}

                <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                    <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200">
                        <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center gap-2">
                            <User className="h-5 w-5 text-gray-400" />
                            ユーザー情報
                        </h3>
                        <p className="mt-1 max-w-2xl text-sm text-gray-500">
                            現在の登録情報を確認できます。
                        </p>
                    </div>

                    <div className="border-t border-gray-200">
                        <dl>
                            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                <dt className="text-sm font-medium text-gray-500 flex items-center gap-2">
                                    <Shield className="h-4 w-4" />
                                    ユーザー名
                                </dt>
                                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                    {user.username}
                                </dd>
                            </div>
                            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                <dt className="text-sm font-medium text-gray-500 flex items-center gap-2">
                                    <Mail className="h-4 w-4" />
                                    メールアドレス
                                </dt>
                                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                    {user.email || '未設定'}
                                </dd>
                            </div>
                            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                <dt className="text-sm font-medium text-gray-500 flex items-center gap-2">
                                    <Briefcase className="h-4 w-4" />
                                    アカウント種別
                                </dt>
                                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                                        ${user.user_type === 'admin' ? 'bg-purple-100 text-purple-800' :
                                            user.user_type === 'internal' ? 'bg-blue-100 text-blue-800' :
                                                'bg-green-100 text-green-800'}`}>
                                        {getRoleDisplayName(user.user_type)}
                                    </span>
                                </dd>
                            </div>

                            {(user.company_name || user.customer_company_name) && (
                                <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                    <dt className="text-sm font-medium text-gray-500 flex items-center gap-2">
                                        <Building className="h-4 w-4" />
                                        会社名
                                    </dt>
                                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                        {user.company_name || user.customer_company_name}
                                    </dd>
                                </div>
                            )}
                        </dl>
                    </div>
                </div>

                {/* パスワード変更セクション */}
                <div className="mt-8 bg-white shadow overflow-hidden sm:rounded-lg">
                    <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                        <div>
                            <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center gap-2">
                                <Lock className="h-5 w-5 text-gray-400" />
                                パスワード変更
                            </h3>
                            <p className="mt-1 max-w-2xl text-sm text-gray-500">
                                アカウントのパスワードを変更できます。
                            </p>
                        </div>
                        {!showPasswordForm && (
                            <button
                                onClick={() => setShowPasswordForm(true)}
                                className="px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 transition-colors"
                            >
                                パスワードを変更
                            </button>
                        )}
                    </div>

                    {showPasswordForm && (
                        <div className="px-4 py-5 sm:px-6">
                            {error && (
                                <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
                                    <div className="flex items-center">
                                        <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                                        <p className="text-sm text-red-700">{error}</p>
                                    </div>
                                </div>
                            )}

                            <form onSubmit={handlePasswordChange} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        現在のパスワード
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPasswords.current ? 'text' : 'password'}
                                            value={passwordData.current_password}
                                            onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        >
                                            {showPasswords.current ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        新しいパスワード
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPasswords.new ? 'text' : 'password'}
                                            value={passwordData.new_password}
                                            onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                            required
                                            minLength={8}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        >
                                            {showPasswords.new ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                        </button>
                                    </div>
                                    <p className="mt-1 text-xs text-gray-500">8文字以上で入力してください</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        新しいパスワード（確認）
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPasswords.confirm ? 'text' : 'password'}
                                            value={passwordData.new_password_confirm}
                                            onChange={(e) => setPasswordData({ ...passwordData, new_password_confirm: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        >
                                            {showPasswords.confirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                        </button>
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="px-4 py-2 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isSubmitting ? '変更中...' : 'パスワードを変更'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowPasswordForm(false);
                                            setError(null);
                                            setPasswordData({
                                                current_password: '',
                                                new_password: '',
                                                new_password_confirm: '',
                                            });
                                        }}
                                        className="px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
                                    >
                                        キャンセル
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default MyProfilePage;

