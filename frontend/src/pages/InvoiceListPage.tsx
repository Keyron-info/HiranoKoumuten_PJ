// frontend/src/pages/InvoiceListPage.tsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { invoiceAPI } from '../api/invoices';
import { InvoiceListItem, InvoiceStatus } from '../types';

const InvoiceListPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchInvoices();
  }, [statusFilter]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const params: any = {};
      
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      
      if (searchQuery) {
        params.search = searchQuery;
      }

      const response = await invoiceAPI.getInvoices(params);
      setInvoices(response.results || response as any);
    } catch (error) {
      console.error('請求書一覧の取得に失敗:', error);
      alert('請求書一覧の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchInvoices();
  };

  const getStatusBadgeColor = (status: InvoiceStatus): string => {
    const colors: Record<InvoiceStatus, string> = {
      draft: 'bg-gray-100 text-gray-800',
      submitted: 'bg-blue-100 text-blue-800',
      pending_approval: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      returned: 'bg-orange-100 text-orange-800',
      payment_preparing: 'bg-purple-100 text-purple-800',
      paid: 'bg-teal-100 text-teal-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP');
  };

  const formatAmount = (amount: number): string => {
    return `¥${amount.toLocaleString()}`;
  };

  // 協力会社ユーザー用のフィルターオプション
  const customerFilterOptions = [
    { value: 'all', label: '全て' },
    { value: 'draft', label: '下書き' },
    { value: 'submitted', label: '提出済み' },
    { value: 'pending_approval', label: '承認待ち' },
    { value: 'approved', label: '承認済み' },
    { value: 'rejected', label: '却下' },
    { value: 'returned', label: '差し戻し' },
  ];

  // 社内ユーザー用のフィルターオプション
  const internalFilterOptions = [
    { value: 'all', label: '全て' },
    { value: 'pending_approval', label: '承認待ち' },
    { value: 'my_approval', label: '自分の承認待ち' },
    { value: 'approved', label: '承認済み' },
    { value: 'rejected', label: '却下' },
    { value: 'returned', label: '差し戻し' },
  ];

  const filterOptions = user?.user_type === 'customer' 
    ? customerFilterOptions 
    : internalFilterOptions;

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">請求書一覧</h1>
              <p className="text-sm text-gray-600 mt-1">
                {user?.user_type === 'customer' ? '提出した請求書' : '全ての請求書'}
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => navigate('/dashboard')}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                ダッシュボード
              </button>
              {user?.user_type === 'customer' && (
                <button
                  onClick={() => navigate('/invoices/create')}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                >
                  新規作成
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* フィルター・検索 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 md:space-x-4">
            {/* ステータスフィルター */}
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-gray-700">
                ステータス:
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                {filterOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 検索 */}
            <form onSubmit={handleSearch} className="flex-1 max-w-md">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="請求書番号、工事現場名で検索"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
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

        {/* 請求書一覧 */}
        {invoices.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500 text-lg">請求書がありません</p>
            {user?.user_type === 'customer' && (
              <button
                onClick={() => navigate('/invoices/create')}
                className="mt-4 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
              >
                最初の請求書を作成
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    請求書番号
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {user?.user_type === 'customer' ? '工事現場' : '協力会社'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    工事現場
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    請求日
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    金額
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ステータス
                  </th>
                  {user?.user_type === 'internal' && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      現在の承認者
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {invoice.invoice_number}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatDate(invoice.created_at)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {user?.user_type === 'customer' 
                          ? invoice.construction_site_name_display 
                          : invoice.customer_company_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {invoice.construction_site_name_display}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(invoice.invoice_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatAmount(invoice.total_amount)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(
                          invoice.status
                        )}`}
                      >
                        {invoice.status_display}
                      </span>
                    </td>
                    {user?.user_type === 'internal' && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {invoice.current_approver_name || '-'}
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => navigate(`/invoices/${invoice.id}`)}
                        className="text-orange-600 hover:text-orange-900 font-medium"
                      >
                        詳細
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvoiceListPage;