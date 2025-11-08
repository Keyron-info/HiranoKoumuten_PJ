// frontend/src/pages/DashboardPage.tsx

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { invoiceAPI } from '../api/invoices';
import { InternalDashboardStats, CustomerDashboardStats } from '../types';

const DashboardPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<InternalDashboardStats | CustomerDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const data = await invoiceAPI.getDashboardStats();
      setStats(data);
    } catch (error) {
      console.error('統計情報の取得に失敗:', error);
    } finally {
      setLoading(false);
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
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
                  {user?.user_type === 'customer' 
                    ? user?.customer_company_name 
                    : user?.position_display}
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
      </div>

      {/* ダッシュボード */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">ダッシュボード</h2>
          <p className="text-gray-600 mt-1">
            {isCustomer ? '請求書の作成・管理' : '請求書の承認・管理'}
          </p>
        </div>

        {/* 協力会社ユーザー向けダッシュボード */}
        {isCustomer && stats && 'draft_count' in stats && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div
                onClick={() => navigate('/invoices?status=draft')}
                className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">下書き</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                      {stats.draft_count}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">件</p>
                  </div>
                  <div className="text-gray-400">
                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div
                onClick={() => navigate('/invoices?status=submitted')}
                className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">提出済み・承認待ち</p>
                    <p className="text-3xl font-bold text-blue-600 mt-2">
                      {stats.submitted_count}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">件</p>
                  </div>
                  <div className="text-blue-400">
                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div
                onClick={() => navigate('/invoices?status=returned')}
                className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">差し戻し</p>
                    <p className="text-3xl font-bold text-orange-600 mt-2">
                      {stats.returned_count}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">件</p>
                  </div>
                  <div className="text-orange-400">
                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div
                onClick={() => navigate('/invoices?status=approved')}
                className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">承認済み</p>
                    <p className="text-3xl font-bold text-green-600 mt-2">
                      {stats.approved_count}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">件</p>
                  </div>
                  <div className="text-green-400">
                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">保留中の合計金額</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    ¥{stats.total_amount_pending.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">提出済み・承認待ち・承認済みの合計</p>
                </div>
                <div className="text-gray-400">
                  <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
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

        {/* 社内ユーザー向けダッシュボード */}
        {isInternal && stats && 'pending_invoices' in stats && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div
                onClick={() => navigate('/invoices?status=pending_approval')}
                className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">承認待ち（全体）</p>
                    <p className="text-3xl font-bold text-yellow-600 mt-2">
                      {stats.pending_invoices}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">件</p>
                  </div>
                  <div className="text-yellow-400">
                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div
                onClick={() => navigate('/invoices?status=my_approval')}
                className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition-shadow border-2 border-orange-500"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-orange-600 font-medium">自分の承認待ち</p>
                    <p className="text-3xl font-bold text-orange-600 mt-2">
                      {stats.my_pending_approvals}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">件（要対応）</p>
                  </div>
                  <div className="text-orange-500">
                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">今月の支払予定</p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">
                      ¥{stats.monthly_payment.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">今月分</p>
                  </div>
                  <div className="text-gray-400">
                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">協力会社数</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                      {stats.partner_companies}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">社</p>
                  </div>
                  <div className="text-gray-400">
                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => navigate('/invoices?status=my_approval')}
                className="flex-1 bg-orange-600 text-white px-6 py-4 rounded-lg hover:bg-orange-700 font-medium text-lg shadow-lg hover:shadow-xl transition-all"
              >
                ⚡ 承認待ちを確認
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
      </div>
    </div>
  );
};

export default DashboardPage;