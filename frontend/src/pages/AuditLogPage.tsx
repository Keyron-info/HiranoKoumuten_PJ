import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Layout from '../components/common/Layout';
import { Search, Filter, RefreshCw, User, Database, Shield, ChevronLeft, ChevronRight } from 'lucide-react';
import apiClient from '../api/client';

interface AuditLog {
    id: number;
    user_name: string;
    action: string;
    action_display: string;
    target_model: string;
    target_id: string;
    target_label: string;
    details: any;
    ip_address: string;
    created_at: string;
}

interface AuditLogResponse {
    count: number;
    next: string | null;
    previous: string | null;
    results: AuditLog[];
}

const AuditLogPage: React.FC = () => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalCount, setTotalCount] = useState(0);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [targetModel, setTargetModel] = useState('');

    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        fetchLogs();
    }, [page, targetModel]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const params: any = {
                page,
                ordering: '-created_at',
            };
            if (search) params.search = search;
            if (targetModel) params.target_model = targetModel;

            const response = await apiClient.get<AuditLogResponse>('/audit-logs/', { params });
            setLogs(response.data.results);
            setTotalCount(response.data.count);
        } catch (error) {
            console.error('Failed to fetch audit logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        fetchLogs();
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('ja-JP');
    };

    const getActionColor = (action: string) => {
        switch (action) {
            case 'create': return 'text-green-600 bg-green-50';
            case 'update': return 'text-blue-600 bg-blue-50';
            case 'delete': return 'text-red-600 bg-red-50';
            case 'approve': return 'text-orange-600 bg-orange-50';
            case 'login': return 'text-purple-600 bg-purple-50';
            default: return 'text-gray-600 bg-gray-50';
        }
    };

    return (
        <Layout>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <Shield className="text-primary-600" />
                            <span>操作ログ監査</span>
                        </h1>
                        <p className="text-gray-500 mt-1">システム内の重要操作の履歴を確認できます</p>
                    </div>
                    <button
                        onClick={fetchLogs}
                        className="p-2 text-gray-400 hover:text-primary-600 transition-colors"
                        title="更新"
                    >
                        <RefreshCw size={20} />
                    </button>
                </div>

                {/* フィルター・検索 */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-wrap gap-4 items-center">
                    <form onSubmit={handleSearch} className="flex-1 min-w-[300px] relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="ユーザー名、内容で検索..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                        />
                    </form>

                    <div className="flex items-center gap-2">
                        <Filter size={18} className="text-gray-400" />
                        <select
                            value={targetModel}
                            onChange={(e) => setTargetModel(e.target.value)}
                            className="border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary-500"
                        >
                            <option value="">全てのモデル</option>
                            <option value="Invoice">請求書</option>
                            <option value="User">ユーザー</option>
                            <option value="ConstructionSite">工事現場</option>
                            <option value="ConstructionType">工種</option>
                        </select>
                    </div>
                </div>

                {/* ログテーブル */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">日時</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ユーザー</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">対象</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">詳細</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IPアドレス</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center">
                                        <div className="flex justify-center">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                                        </div>
                                    </td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                        ログが見つかりませんでした
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {formatDate(log.created_at)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <User size={16} className="text-gray-400 mr-2" />
                                                <span className="text-sm font-medium text-gray-900">{log.user_name || 'System'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getActionColor(log.action)}`}>
                                                {log.action_display}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900 flex items-center gap-1">
                                                <Database size={14} className="text-gray-400" />
                                                {log.target_model}
                                            </div>
                                            <div className="text-xs text-gray-500">{log.target_label || `ID: ${log.target_id}`}</div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                                            {JSON.stringify(log.details)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {log.ip_address || '-'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>

                    {/* ページネーション */}
                    <div className="bg-white px-4 py-3 border-t border-gray-200 flex items-center justify-between sm:px-6">
                        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm text-gray-700">
                                    全 <span className="font-medium">{totalCount}</span> 件中 <span className="font-medium">{(page - 1) * 20 + 1}</span> から <span className="font-medium">{Math.min(page * 20, totalCount)}</span> 件を表示
                                </p>
                            </div>
                            <div>
                                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                    <button
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                    >
                                        <span className="sr-only">前へ</span>
                                        <ChevronLeft size={20} />
                                    </button>
                                    <button
                                        onClick={() => setPage(p => p + 1)}
                                        disabled={logs.length < 20}
                                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                    >
                                        <span className="sr-only">次へ</span>
                                        <ChevronRight size={20} />
                                    </button>
                                </nav>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default AuditLogPage;
