import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

// 型定義
interface DashboardStats {
  pending_invoices?: number;
  pending_approvals?: number;
  monthly_payment?: number;
  partner_companies?: number;
  draft_count?: number;
  submitted_count?: number;
  returned_count?: number;
  approved_count?: number;
  total_amount_pending?: number;
}

interface RecentInvoice {
  id: number;
  invoice_number: string;
  customer_company_name: string;
  construction_site_name: string;
  total_amount: number;
  status: string;
  payment_due_date: string;
}

interface User {
  id: number;
  username: string;
  email: string;
  user_type: 'internal' | 'customer';
  company_name?: string;
  department_name?: string;
  position?: string;
}

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentInvoices, setRecentInvoices] = useState<RecentInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('access_token');
      
      // トークンがない場合
      if (!token) {
        console.error('トークンがありません');
        setLoading(false);
        return;
      }

      const headers = { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // ユーザー情報取得
      try {
        const userResponse = await axios.get('http://localhost:8000/api/users/me/', { headers });
        console.log('User data:', userResponse.data);
        setUser(userResponse.data);
      } catch (userError: any) {
        console.error('ユーザー情報取得エラー:', userError);
        if (userError?.response?.status === 401) {
          localStorage.removeItem('token');
          setLoading(false);
          return;
        }
      }

      // ダッシュボード統計取得
      try {
        const statsResponse = await axios.get('http://localhost:8000/api/dashboard/stats/', { headers });
        console.log('Stats data:', statsResponse.data);
        setStats(statsResponse.data);
      } catch (statsError) {
        console.error('統計データ取得エラー:', statsError);
        setStats({});
      }

      // 最近の請求書取得
      try {
        const invoicesResponse = await axios.get('http://localhost:8000/api/invoices/?limit=5', { headers });
        console.log('Invoices data:', invoicesResponse.data);
        const invoicesData = invoicesResponse.data.results || invoicesResponse.data || [];
        setRecentInvoices(Array.isArray(invoicesData) ? invoicesData : []);
      } catch (invoicesError) {
        console.error('請求書データ取得エラー:', invoicesError);
        setRecentInvoices([]);
      }

      setLoading(false);
    } catch (error: any) {
      console.error('ダッシュボードデータ取得エラー:', error);
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: { [key: string]: { label: string; bgColor: string; textColor: string } } = {
      draft: { label: '下書き', bgColor: 'bg-gray-100', textColor: 'text-gray-700' },
      submitted: { label: '提出済み', bgColor: 'bg-blue-100', textColor: 'text-blue-700' },
      in_approval: { label: '承認中', bgColor: 'bg-yellow-100', textColor: 'text-yellow-700' },
      approved: { label: '承認済み', bgColor: 'bg-green-100', textColor: 'text-green-700' },
      rejected: { label: '却下', bgColor: 'bg-red-100', textColor: 'text-red-700' },
      returned: { label: '差し戻し', bgColor: 'bg-orange-100', textColor: 'text-orange-700' },
      paid: { label: '支払い済み', bgColor: 'bg-purple-100', textColor: 'text-purple-700' },
    };

    const config = statusConfig[status] || { label: status, bgColor: 'bg-gray-100', textColor: 'text-gray-700' };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.textColor}`}>
        {config.label}
      </span>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  // 協力会社向けダッシュボード
  if (user?.user_type === 'customer') {
    return (
      <div className="p-6">
        {/* ウェルカムバナー */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-400 text-white p-8 rounded-2xl mb-6 shadow-lg">
          <h2 className="text-2xl font-bold mb-2">ようこそ、{user.company_name || 'お客様'} 様</h2>
          <p className="text-orange-50">請求書の作成・提出がスムーズに行えます</p>
        </div>

        {/* クイックステータス */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="text-3xl font-bold text-orange-500 mb-1">
              {stats?.draft_count || recentInvoices.filter(inv => inv.status === 'draft').length}
            </div>
            <div className="text-sm text-gray-600">下書き中</div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="text-3xl font-bold text-blue-500 mb-1">
              {stats?.submitted_count || recentInvoices.filter(inv => ['submitted', 'in_approval'].includes(inv.status)).length}
            </div>
            <div className="text-sm text-gray-600">承認待ち</div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="text-3xl font-bold text-red-500 mb-1">
              {stats?.returned_count || recentInvoices.filter(inv => inv.status === 'returned').length}
            </div>
            <div className="text-sm text-gray-600">差し戻し</div>
          </div>
        </div>

        {/* アクションボタン */}
        <div className="bg-white p-6 rounded-xl shadow-sm mb-6 border border-gray-100">
          <h3 className="text-lg font-bold mb-4 text-gray-800">クイックアクション</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              onClick={() => navigate('/invoices/create')}
              className="flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white py-3 px-4 rounded-lg transition-colors"
            >
              <span className="text-xl">📝</span>
              <span className="font-medium">新規請求書作成</span>
            </button>
            <button
              onClick={() => navigate('/invoices?status=draft')}
              className="flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-4 rounded-lg transition-colors"
            >
              <span className="text-xl">📄</span>
              <span className="font-medium">下書き一覧</span>
            </button>
          </div>
        </div>

        {/* 最近の請求書 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-800">最近の請求書</h3>
              <button
                onClick={() => navigate('/invoices')}
                className="text-sm text-orange-500 hover:text-orange-600 font-medium"
              >
                すべて表示 →
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    請求書番号
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    工事現場
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    金額
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ステータス
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    期日
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentInvoices.length > 0 ? (
                  recentInvoices.map((invoice) => (
                    <tr
                      key={invoice.id}
                      onClick={() => navigate(`/invoices/${invoice.id}`)}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {invoice.invoice_number || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {invoice.construction_site_name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {formatCurrency(invoice.total_amount || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(invoice.status)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {invoice.payment_due_date ? formatDate(invoice.payment_due_date) : '-'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      請求書がありません
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // 社内ユーザー向けダッシュボード
  return (
    <div className="p-6">
      {/* ヘッダー */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">ダッシュボード</h1>
        <p className="text-gray-600">
          {user?.department_name && `${user.department_name} - `}
          {user?.position || '社内ユーザー'}
        </p>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">未処理請求書</span>
            <span className="text-2xl">📋</span>
          </div>
          <div className="text-3xl font-bold text-gray-800">{stats?.pending_invoices || 0}</div>
          <div className="text-xs text-gray-500 mt-2">要対応</div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">承認待ち</span>
            <span className="text-2xl">⏳</span>
          </div>
          <div className="text-3xl font-bold text-orange-500">{stats?.pending_approvals || 0}</div>
          <div className="text-xs text-gray-500 mt-2">承認が必要</div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">今月の支払い予定</span>
            <span className="text-2xl">💰</span>
          </div>
          <div className="text-3xl font-bold text-blue-500">
            {formatCurrency(stats?.monthly_payment || 0)}
          </div>
          <div className="text-xs text-gray-500 mt-2">当月合計</div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">登録協力会社</span>
            <span className="text-2xl">🏢</span>
          </div>
          <div className="text-3xl font-bold text-green-500">{stats?.partner_companies || 0}</div>
          <div className="text-xs text-gray-500 mt-2">アクティブ</div>
        </div>
      </div>

      {/* 最近の請求書 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-800">最近の請求書</h3>
            <button
              onClick={() => navigate('/invoices')}
              className="text-sm bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              すべて表示
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  請求書番号
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  協力会社
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  工事現場
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  金額
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ステータス
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  期日
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentInvoices.length > 0 ? (
                recentInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {invoice.invoice_number || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {invoice.customer_company_name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {invoice.construction_site_name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {formatCurrency(invoice.total_amount || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(invoice.status)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {invoice.payment_due_date ? formatDate(invoice.payment_due_date) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => navigate(`/invoices/${invoice.id}`)}
                        className="text-orange-500 hover:text-orange-600 font-medium"
                      >
                        詳細
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    請求書がありません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;