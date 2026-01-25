import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/common/Layout';
import { User, Building, Mail, Shield, Briefcase } from 'lucide-react';

const MyProfilePage: React.FC = () => {
    const { user } = useAuth();

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

    return (
        <Layout>
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-6">マイページ</h1>
                
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

                <div className="mt-8 bg-blue-50 border border-blue-200 rounded-md p-4">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3 flex-1 md:flex md:justify-between">
                            <p className="text-sm text-blue-700">
                                登録情報の変更やパスワードリセットが必要な場合は、システム管理者にご連絡ください。
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default MyProfilePage;
