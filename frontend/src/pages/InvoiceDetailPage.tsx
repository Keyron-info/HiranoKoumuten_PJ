import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { invoiceAPI } from '../api/invoices';
import { Invoice, InvoiceStatus, ApprovalHistory } from '../types';
import Layout from '../components/common/Layout';
import { useAuth } from '../contexts/AuthContext';

const InvoiceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [comment, setComment] = useState<string>('');
  const [showCommentModal, setShowCommentModal] = useState<boolean>(false);
  const [modalAction, setModalAction] = useState<'approve' | 'reject' | 'return' | null>(null);

  useEffect(() => {
    if (id) {
      fetchInvoice(id);
    }
  }, [id]);

  const fetchInvoice = async (invoiceId: string) => {
    setLoading(true);
    try {
      const data = await invoiceAPI.getInvoice(invoiceId);
      setInvoice(data);
    } catch (error) {
      console.error('Failed to fetch invoice:', error);
      alert('請求書の取得に失敗しました');
      navigate('/invoices');
    } finally {
      setLoading(false);
    }
  };

  // ステータスバッジ
  const getStatusBadge = (status: InvoiceStatus) => {
    const badges: Record<InvoiceStatus, { label: string; color: string }> = {
      draft: { label: '下書き', color: 'bg-gray-100 text-gray-800' },
      submitted: { label: '提出済み', color: 'bg-blue-100 text-blue-800' },
      supervisor_review: { label: '現場監督確認中', color: 'bg-yellow-100 text-yellow-800' },
      manager_review: { label: '部長確認中', color: 'bg-yellow-100 text-yellow-800' },
      final_review: { label: '最終確認中', color: 'bg-purple-100 text-purple-800' },
      approved: { label: '承認済み', color: 'bg-green-100 text-green-800' },
      rejected: { label: '差し戻し', color: 'bg-red-100 text-red-800' },
      paid: { label: '支払済み', color: 'bg-green-100 text-green-800' },
    };
    return badges[status] || { label: status, color: 'bg-gray-100 text-gray-800' };
  };

  // 提出
  const handleSubmit = async () => {
    if (!id || !window.confirm('この請求書を提出しますか?')) return;
    setActionLoading(true);
    try {
      await invoiceAPI.submitInvoice(id);
      alert('請求書を提出しました');
      fetchInvoice(id);
    } catch (error) {
      console.error('Failed to submit invoice:', error);
      alert('提出に失敗しました');
    } finally {
      setActionLoading(false);
    }
  };

  // 承認
  const handleApprove = async () => {
    if (!id) return;
    setActionLoading(true);
    try {
      await invoiceAPI.approveInvoice(id, comment);
      alert('請求書を承認しました');
      setShowCommentModal(false);
      setComment('');
      fetchInvoice(id);
    } catch (error) {
      console.error('Failed to approve invoice:', error);
      alert('承認に失敗しました');
    } finally {
      setActionLoading(false);
    }
  };

  // 差し戻し
  const handleReject = async () => {
    if (!id) return;
    if (!comment.trim()) {
      alert('差し戻し理由を入力してください');
      return;
    }
    setActionLoading(true);
    try {
      await invoiceAPI.rejectInvoice(id, comment);
      alert('請求書を差し戻しました');
      setShowCommentModal(false);
      setComment('');
      fetchInvoice(id);
    } catch (error) {
      console.error('Failed to reject invoice:', error);
      alert('差し戻しに失敗しました');
    } finally {
      setActionLoading(false);
    }
  };

  // 却下
  const handleReturn = async () => {
    if (!id) return;
    if (!comment.trim()) {
      alert('却下理由を入力してください');
      return;
    }
    setActionLoading(true);
    try {
      await invoiceAPI.returnInvoice(id, comment);
      alert('請求書を却下しました');
      setShowCommentModal(false);
      setComment('');
      fetchInvoice(id);
    } catch (error) {
      console.error('Failed to return invoice:', error);
      alert('却下に失敗しました');
    } finally {
      setActionLoading(false);
    }
  };

  // アクション実行
  const executeAction = () => {
    if (modalAction === 'approve') handleApprove();
    else if (modalAction === 'reject') handleReject();
    else if (modalAction === 'return') handleReturn();
  };

  // 印刷
  const handlePrint = () => {
    window.print();
  };

  // アクションボタンの表示判定
  const canSubmit = user?.role === 'partner' && invoice?.status === 'draft';
  const canApprove = ['supervisor', 'manager', 'executive', 'accounting'].includes(user?.role || '') &&
    ['supervisor_review', 'manager_review', 'final_review'].includes(invoice?.status || '');
  const canReject = ['supervisor', 'manager', 'executive'].includes(user?.role || '') &&
    ['supervisor_review', 'manager_review', 'final_review'].includes(invoice?.status || '');

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </Layout>
    );
  }

  if (!invoice) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-600">請求書が見つかりません</p>
          <button
            onClick={() => navigate('/invoices')}
            className="mt-4 px-6 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600"
          >
            一覧に戻る
          </button>
        </div>
      </Layout>
    );
  }

  const badge = getStatusBadge(invoice.status);

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ヘッダー */}
        <div className="flex justify-between items-start mb-6 print:hidden">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">請求書詳細</h1>
            <p className="mt-2 text-sm text-gray-600">請求書番号: {invoice.invoice_number}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/invoices')}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              一覧に戻る
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              印刷
            </button>
          </div>
        </div>

        {/* ステータスバッジ */}
        <div className="mb-6 print:hidden">
          <span className={`px-4 py-2 inline-flex text-sm leading-5 font-semibold rounded-full ${badge.color}`}>
            {badge.label}
          </span>
        </div>

        {/* 請求書本体 */}
        <div className="bg-white rounded-lg shadow-lg p-8 print:shadow-none">
          {/* ヘッダー部分 */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">請 求 書</h2>
            <p className="text-sm text-gray-600">
              {new Date(invoice.invoice_date).toLocaleDateString('ja-JP', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>

          {/* 請求先・請求元 */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            {/* 請求先 */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">請求先</h3>
              <div className="border-l-4 border-orange-500 pl-4">
                <p className="text-lg font-bold text-gray-900">{invoice.customer_company_name}</p>
                <p className="text-sm text-gray-600 mt-1">御中</p>
              </div>
            </div>

            {/* 請求元 */}
            <div className="text-right">
              <h3 className="text-sm font-medium text-gray-500 mb-2">請求元</h3>
              <div className="border-r-4 border-orange-500 pr-4">
                <p className="text-lg font-bold text-gray-900">{user?.company.name}</p>
                <p className="text-xs text-gray-600 mt-1">{user?.company.address}</p>
              </div>
            </div>
          </div>

          {/* 工事情報 */}
          <div className="grid grid-cols-2 gap-4 mb-8 bg-gray-50 p-4 rounded-md">
            <div>
              <p className="text-sm text-gray-600">工事現場</p>
              <p className="text-base font-medium text-gray-900">{invoice.construction_site_name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">工事名</p>
              <p className="text-base font-medium text-gray-900">{invoice.project_name || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">請求日</p>
              <p className="text-base font-medium text-gray-900">
                {new Date(invoice.invoice_date).toLocaleDateString('ja-JP')}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">支払予定日</p>
              <p className="text-base font-medium text-gray-900">
                {new Date(invoice.payment_due_date).toLocaleDateString('ja-JP')}
              </p>
            </div>
          </div>

          {/* 請求明細テーブル */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">請求明細</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700">#</th>
                    <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700">品名</th>
                    <th className="border border-gray-300 px-4 py-2 text-right text-sm font-medium text-gray-700">数量</th>
                    <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700">単位</th>
                    <th className="border border-gray-300 px-4 py-2 text-right text-sm font-medium text-gray-700">単価</th>
                    <th className="border border-gray-300 px-4 py-2 text-right text-sm font-medium text-gray-700">金額</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-4 py-2 text-sm text-gray-600">
                        {item.item_number}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-sm text-gray-900">
                        {item.description}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-sm text-right text-gray-900">
                        {item.quantity}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-sm text-gray-900">
                        {item.unit}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-sm text-right text-gray-900">
                        ¥{item.unit_price.toLocaleString()}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-sm text-right font-medium text-gray-900">
                        ¥{item.amount.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 金額合計 */}
          <div className="flex justify-end mb-8">
            <div className="w-80">
              <div className="border-t border-gray-300 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-700">小計</span>
                  <span className="font-medium text-gray-900">¥{invoice.subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-700">消費税 (10%)</span>
                  <span className="font-medium text-gray-900">¥{invoice.tax_amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-300">
                  <span className="text-gray-900">合計</span>
                  <span className="text-orange-600">¥{invoice.total_amount.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 備考 */}
          {invoice.notes && (
            <div className="mb-8">
              <h3 className="text-sm font-medium text-gray-700 mb-2">備考</h3>
              <div className="bg-gray-50 p-4 rounded-md">
                <p className="text-sm text-gray-900 whitespace-pre-wrap">{invoice.notes}</p>
              </div>
            </div>
          )}
        </div>

        {/* アクションボタン */}
        <div className="mt-6 flex justify-end gap-4 print:hidden">
          {canSubmit && (
            <button
              onClick={handleSubmit}
              disabled={actionLoading}
              className="px-6 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              提出する
            </button>
          )}

          {canApprove && (
            <button
              onClick={() => {
                setModalAction('approve');
                setShowCommentModal(true);
              }}
              disabled={actionLoading}
              className="px-6 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              承認する
            </button>
          )}

          {canReject && (
            <>
              <button
                onClick={() => {
                  setModalAction('return');
                  setShowCommentModal(true);
                }}
                disabled={actionLoading}
                className="px-6 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                差し戻し
              </button>
              <button
                onClick={() => {
                  setModalAction('reject');
                  setShowCommentModal(true);
                }}
                disabled={actionLoading}
                className="px-6 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                却下
              </button>
            </>
          )}
        </div>

        {/* コメントモーダル */}
        {showCommentModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {modalAction === 'approve' && '承認コメント'}
                {modalAction === 'reject' && '却下理由'}
                {modalAction === 'return' && '差し戻し理由'}
              </h3>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                placeholder={modalAction === 'approve' ? 'コメント(任意)' : '理由を入力してください(必須)'}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowCommentModal(false);
                    setComment('');
                    setModalAction(null);
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  キャンセル
                </button>
                <button
                  onClick={executeAction}
                  disabled={actionLoading || (modalAction !== 'approve' && !comment.trim())}
                  className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading ? '処理中...' : '実行'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 印刷用スタイル */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .bg-white, .bg-white * {
            visibility: visible;
          }
          .bg-white {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </Layout>
  );
};

export default InvoiceDetailPage;