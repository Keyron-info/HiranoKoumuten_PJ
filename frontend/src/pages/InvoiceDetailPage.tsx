import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { invoiceAPI } from '../api/invoices';
import { Invoice } from '../types';
import Layout from '../components/common/Layout';

const InvoiceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (id) {
      fetchInvoice(id);
    }
  }, [id]);

  const fetchInvoice = async (invoiceId: string) => {
    try {
      const data = await invoiceAPI.getInvoice(invoiceId);
      setInvoice(data);
    } catch (error) {
      console.error('Failed to fetch invoice:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!id) return;
    try {
      await invoiceAPI.submitInvoice(id);
      alert('請求書を提出しました');
      fetchInvoice(id);
    } catch (error) {
      console.error('Failed to submit invoice:', error);
      alert('提出に失敗しました');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-8">読み込み中...</div>
      </Layout>
    );
  }

  if (!invoice) {
    return (
      <Layout>
        <div className="text-center py-8">請求書が見つかりません</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">請求書詳細</h1>
          <button onClick={() => navigate('/invoices')} className="btn-secondary">戻る</button>
        </div>

        <div className="bg-white shadow rounded-lg p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">請求書番号</p>
              <p className="font-medium">{invoice.invoice_number}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">ステータス</p>
              <p className="font-medium">{invoice.status}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">工事現場</p>
              <p className="font-medium">{invoice.construction_site_name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">請求日</p>
              <p className="font-medium">{invoice.invoice_date}</p>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="font-medium mb-2">明細</h3>
            <table className="min-w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">品名</th>
                  <th className="text-right py-2">数量</th>
                  <th className="text-right py-2">単価</th>
                  <th className="text-right py-2">金額</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item) => (
                  <tr key={item.id} className="border-b">
                    <td className="py-2">{item.description}</td>
                    <td className="text-right">{item.quantity} {item.unit}</td>
                    <td className="text-right">¥{item.unit_price.toLocaleString()}</td>
                    <td className="text-right">¥{item.amount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-bold">
                  <td colSpan={3} className="text-right py-2">小計</td>
                  <td className="text-right">¥{invoice.subtotal.toLocaleString()}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="text-right py-2">消費税</td>
                  <td className="text-right">¥{invoice.tax_amount.toLocaleString()}</td>
                </tr>
                <tr className="font-bold text-lg">
                  <td colSpan={3} className="text-right py-2">合計</td>
                  <td className="text-right">¥{invoice.total_amount.toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {invoice.status === 'draft' && (
            <div className="pt-4">
              <button onClick={handleSubmit} className="btn-primary">提出する</button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default InvoiceDetailPage;