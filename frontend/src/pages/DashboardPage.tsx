// frontend/src/pages/DashboardPage.tsx
// Phase 2対応 統合ダッシュボード

import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { invoiceAPI } from '../api/invoices';
import axios from 'axios';
import {
  InternalDashboardStats,
  CustomerDashboardStats,
} from '../types';

interface CurrentPeriod {
  period_name: string;
  deadline_date: string;
  is_closed: boolean;
  days_until_deadline: number;
}

interface RecentInvoice {
  id: number;
  invoice_number: string;
  customer_company_name: string;
  total_amount: string;
  status_display: string;
  created_at: string;
}

const DashboardPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState<InternalDashboardStats | CustomerDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPeriod, setCurrentPeriod] = useState<CurrentPeriod | null>(null);
  const [recentInvoices, setRecentInvoices] = useState<RecentInvoice[]>([]);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      const [statsData, periodData, invoicesData] = await Promise.all([
        invoiceAPI.getDashboardStats(),
        fetchCurrentPeriod(),
        fetchRecentInvoices(),
      ]);

      setStats(statsData);
      if (periodData) setCurrentPeriod(periodData);
      if (invoicesData) setRecentInvoices(invoicesData.slice(0, 5));
    } catch (error) {
      console.error('ダッシュボードデータ取得失敗:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentPeriod = async (): Promise<CurrentPeriod | null> => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:8000/api/invoice-periods/current/', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const period = res.data;
      const deadline = new Date(period.deadline_date);
      const diffDays = Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return { ...period, days_until_deadline: diffDays };
    } catch {
      console.log('当月期間なし');
      return null;
    }
  };

  const fetchRecentInvoices = async (): Promise<RecentInvoice[]> => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:8000/api/invoices/', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = res.data.results || res.data;
      return data;
    } catch {
      console.log('最近の請求書取得失敗');
      return [];
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  const isInternal = user?.user_type === 'internal';
  const isCustomer = user?.user_type === 'customer';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-orange-600">KEYRON BIM</h1>
            <p className="text-sm text-gray-600 mt-1">請求書管理システム</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">
                {user?.last_name} {user?.first_name}
              </p>
              <p className="text-xs text-gray-500">
                {isCustomer ? user?.customer_company_name : user?.position_display}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
            >
              ログアウト
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 当月期間アラート */}
        {currentPeriod && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              currentPeriod.is_closed
                ? 'bg-red-100 border border-red-300'
                : currentPeriod.days_until_deadline <= 3
                ? 'bg-yellow-100 border border-yellow-300'
                : 'bg-blue-100 border border-blue-300'
            }`}
          >
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg">{currentPeriod.period_name}</h3>
                <p className="text-sm mt-1">
                  締切日:{' '}
                  {new Date(currentPeriod.deadline_date).toLocaleDateString('ja-JP')}
                  {!currentPeriod.is_closed && (
                    <span className="ml-2 font-medium">
                      （あと{currentPeriod.days_until_deadline}日）
                    </span>
                  )}
                </p>
              </div>
              <span
                className={`px-4 py-2 rounded-full font-bold text-white ${
                  currentPeriod.is_closed ? 'bg-red-500' : 'bg-green-500'
                }`}
              >
                {currentPeriod.is_closed ? '締め済み' : '受付中'}
              </span>
            </div>
          </div>
        )}

        {/* タイトル */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">ダッシュボード</h2>
          <p className="text-gray-600 mt-1">
            {isCustomer ? '請求書の作成・管理' : '請求書の承認・管理'}
          </p>
        </div>

        {/* 顧客 or 社内統計カード */}
        {isCustomer && stats && 'draft_count' in stats && (
          <>
            {/* 顧客用カード */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[
                { label: '下書き', value: stats.draft_count, color: 'gray', path: 'draft' },
                { label: '提出済み・承認待ち', value: stats.submitted_count, color: 'blue', path: 'submitted' },
                { label: '差し戻し', value: stats.returned_count, color: 'orange', path: 'returned' },
                { label: '承認済み', value: stats.approved_count, color: 'green', path: 'approved' },
              ].map((item) => (
                <div
                  key={item.label}
                  onClick={() => navigate(`/invoices?status=${item.path}`)}
                  className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition-shadow"
                >
                  <p className="text-sm text-gray-600">{item.label}</p>
                  <p className={`text-3xl font-bold text-${item.color}-600 mt-2`}>
                    {item.value}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">件</p>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <button
                onClick={() => navigate('/invoices/create')}
                className="flex-1 bg-orange-600 text-white px-6 py-4 rounded-lg hover:bg-orange-700 font-medium text-lg shadow-lg hover:shadow-xl transition-all"
              >
                ✨ 新規請求書を作成
              </button>
              <button
                onClick={() => navigate('/invoices')}
                className="flex-1 bg-white text-gray-700 px-6 py-4 rounded-lg hover:bg-gray-50 font-medium text-lg shadow border border-gray-300"
              >
                📋 請求書一覧を見る
              </button>
            </div>
          </>
        )}

        {isInternal && stats && 'pending_invoices' in stats && (
          <>
            {/* 社内用カード */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition-shadow"
                   onClick={() => navigate('/invoices?status=pending_approval')}>
                <p className="text-sm text-gray-600">承認待ち（全体）</p>
                <p className="text-3xl font-bold text-yellow-600 mt-2">{stats.pending_invoices}</p>
                <p className="text-xs text-gray-500 mt-1">件</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6 border-2 border-orange-500 cursor-pointer hover:shadow-lg transition-shadow"
                   onClick={() => navigate('/invoices?status=my_approval')}>
                <p className="text-sm text-orange-600 font-medium">自分の承認待ち</p>
                <p className="text-3xl font-bold text-orange-600 mt-2">{stats.my_pending_approvals}</p>
                <p className="text-xs text-gray-500 mt-1">件（要対応）</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-sm text-gray-600">今月の支払予定</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  ¥{stats.monthly_payment.toLocaleString()}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-sm text-gray-600">協力会社数</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.partner_companies}</p>
                <p className="text-xs text-gray-500 mt-1">社</p>
              </div>
            </div>
          </>
        )}

        {/* 最近の請求書 */}
        {recentInvoices.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4">最近の請求書</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">請求書番号</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">協力会社</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">金額</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ステータス</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">作成日</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentInvoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link to={`/invoices/${invoice.id}`} className="text-blue-600 hover:text-blue-800 font-medium">
                          {invoice.invoice_number}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{invoice.customer_company_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        ¥{parseFloat(invoice.total_amount).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-3 py-1 text-xs font-semibold rounded-full bg-gray-100">
                          {invoice.status_display}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(invoice.created_at).toLocaleDateString('ja-JP')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
