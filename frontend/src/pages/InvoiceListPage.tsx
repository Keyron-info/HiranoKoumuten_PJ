import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { invoiceAPI } from '../api/invoices';
import { Invoice } from '../types';
import Layout from '../components/common/Layout';

const InvoiceListPage: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetchInvoices();
  }, [filter]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const params = filter !== 'all' ? { status: filter } : {};
      const response = await invoiceAPI.getInvoices(params);
      setInvoices(response.results);
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; color: string }> = {
      draft: { label: '下書き', color: 'bg-gray-100 text-gray-800' },
      submitted: { label: '提出済み', color: 'bg-blue-100 text-blue-800' },
      supervisor_review: { label: '確認中', color: 'bg-yellow-100 text-yellow-800' },
      approved: { label: '承認済み', color: 'bg-green-100 text-green-800' },
      rejected: { label: '差し戻し', color: 'bg-red-100 text-red-800' },
      paid: { label: '支払済み', color: 'bg-purple-100 text-purple-800' },
    };
    const config = statusConfig[status] || { label: status, color: 'bg-gray-100 text-gray-800' };
    return <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>{config.label}</span>;
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">請求書一覧</h1>
          <Link to="/invoices/create" className="btn-primary">
            新規作成
          </Link>
        </div>

        {/* フィルター（後でFigmaデザインに差し替え） */}
        <div className="mb-4 flex gap-2">
          <button onClick={() => setFilter('all')} className={filter === 'all' ? 'btn-primary' : 'btn-secondary'}>すべて</button>
          <button onClick={() => setFilter('draft')} className={filter === 'draft' ? 'btn-primary' : 'btn-secondary'}>下書き</button>
          <button onClick={() => setFilter('submitted')} className={filter === 'submitted' ? 'btn-primary' : 'btn-secondary'}>提出済み</button>
          <button onClick={() => setFilter('approved')} className={filter === 'approved' ? 'btn-primary' : 'btn-secondary'}>承認済み</button>
        </div>

        {loading ? (
          <div className="text-center py-8">読み込み中...</div>
        ) : (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">請求書番号</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">工事現場</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">請求日</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">金額</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ステータス</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{invoice.invoice_number}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{invoice.construction_site_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{invoice.invoice_date}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">¥{invoice.total_amount.toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(invoice.status)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Link to={`/invoices/${invoice.id}`} className="text-primary-600 hover:text-primary-900">詳細</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default InvoiceListPage;