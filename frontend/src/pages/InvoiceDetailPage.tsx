// frontend/src/pages/InvoiceDetailPage.tsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { invoiceAPI } from '../api/invoices';
import { Invoice, InvoiceStatus } from '../types';

const InvoiceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [comment, setComment] = useState('');
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    if (id) {
      fetchInvoice();
    }
  }, [id]);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      const data = await invoiceAPI.getInvoice(id!);
      setInvoice(data);
    } catch (error) {
      console.error('請求書の取得に失敗:', error);
      alert('請求書の取得に失敗しました');
      navigate('/invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!invoice) return;
    
    if (!window.confirm('請求書を提出しますか？\n提出後は編集できなくなります。')) {
      return;
    }

    try {
      setActionLoading(true);
      const response = await invoiceAPI.submitInvoice(invoice.id);
      alert(response.message);
      await fetchInvoice();
    } catch (error: any) {
      console.error('提出に失敗:', error);
      const errorMessage = error.response?.data?.error || '提出に失敗しました';
      alert(errorMessage);
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!invoice) return;

    try {
      setActionLoading(true);
      const response = await invoiceAPI.approveInvoice(invoice.id, comment);
      alert(response.message);
      setComment('');
      await fetchInvoice();
    } catch (error: any) {
      console.error('承認に失敗:', error);
      const errorMessage = error.response?.data?.error || '承認に失敗しました';
      alert(errorMessage);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!invoice) return;

    const reason = window.prompt('却下理由を入力してください（任意）:');
    if (reason === null) return; // キャンセル

    try {
      setActionLoading(true);
      const response = await invoiceAPI.rejectInvoice(invoice.id, reason || '却下');
      alert(response.message);
      await fetchInvoice();
    } catch (error: any) {
      console.error('却下に失敗:', error);
      const errorMessage = error.response?.data?.error || '却下に失敗しました';
      alert(errorMessage);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReturn = async () => {
    if (!invoice) return;

    const reason = window.prompt('差し戻し理由を入力してください（任意）:');
    if (reason === null) return; // キャンセル

    try {
      setActionLoading(true);
      const response = await invoiceAPI.returnInvoice(invoice.id, reason || '差し戻し');
      alert(response.message);
      await fetchInvoice();
    } catch (error: any) {
      console.error('差し戻しに失敗:', error);
      const errorMessage = error.response?.data?.error || '差し戻しに失敗しました';
      alert(errorMessage);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!invoice || !newComment.trim()) return;

    try {
      await invoiceAPI.addComment(invoice.id, newComment, 'general', false);
      setNewComment('');
      await fetchInvoice();
    } catch (error) {
      console.error('コメント追加に失敗:', error);
      alert('コメント追加に失敗しました');
    }
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

  const formatDateTime = (dateString: string): string => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('ja-JP');
  };

  const formatAmount = (amount: number): string => {
    return `¥${amount.toLocaleString()}`;
  };

  // 承認・却下・差し戻しボタンの表示判定
  const canApprove = user?.user_type === 'internal' && 
    invoice?.status === 'pending_approval' &&
    (invoice?.current_approver === user?.id || user?.position === 'accountant');

  const canSubmit = user?.user_type === 'customer' && invoice?.status === 'draft';

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

  if (!invoice) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* ヘッダー */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/invoices')}
                className="text-gray-600 hover:text-gray-900"
              >
                ← 戻る
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">請求書詳細</h1>
                <p className="text-sm text-gray-600 mt-1">{invoice.invoice_number}</p>
              </div>
            </div>
            <span
              className={`px-4 py-2 text-sm font-semibold rounded-full ${getStatusBadgeColor(
                invoice.status
              )}`}
            >
              {invoice.status_display}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* メインコンテンツ */}
          <div className="lg:col-span-2 space-y-6">
            {/* 基本情報 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">基本情報</h2>
              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">請求書番号</dt>
                  <dd className="mt-1 text-sm text-gray-900">{invoice.invoice_number}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">協力会社</dt>
                  <dd className="mt-1 text-sm text-gray-900">{invoice.customer_company_name}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">工事現場</dt>
                  <dd className="mt-1 text-sm text-gray-900">{invoice.construction_site_name_display}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">工事名</dt>
                  <dd className="mt-1 text-sm text-gray-900">{invoice.project_name || '-'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">請求日</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatDate(invoice.invoice_date)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">支払予定日</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatDate(invoice.payment_due_date)}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-sm font-medium text-gray-500">備考</dt>
                  <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
                    {invoice.notes || '-'}
                  </dd>
                </div>
              </dl>
            </div>

            {/* 請求明細 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">請求明細</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">No</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">品名・摘要</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">数量</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">単位</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">単価</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">金額</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {invoice.items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {item.item_number}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">{item.description}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                          {item.quantity}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {item.unit}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                          {formatAmount(item.unit_price)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                          {formatAmount(item.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan={5} className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                        小計
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                        {formatAmount(invoice.subtotal)}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={5} className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                        消費税（10%）
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                        {formatAmount(invoice.tax_amount)}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={5} className="px-4 py-3 text-lg font-bold text-gray-900 text-right">
                        合計金額
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-lg font-bold text-orange-600 text-right">
                        {formatAmount(invoice.total_amount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* コメントセクション */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">コメント</h2>
              
              {/* コメント一覧 */}
              <div className="space-y-4 mb-6">
                {invoice.comments.length === 0 ? (
                  <p className="text-sm text-gray-500">コメントはありません</p>
                ) : (
                  invoice.comments.map((comment) => (
                    <div key={comment.id} className="border-l-4 border-orange-500 pl-4 py-2">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-900">
                            {comment.user_name}
                          </span>
                          <span className="text-xs text-gray-500">
                            ({comment.user_position})
                          </span>
                          {comment.is_private && (
                            <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                              社内限定
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">
                          {formatDateTime(comment.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.comment}</p>
                    </div>
                  ))
                )}
              </div>

              {/* コメント追加 */}
              <div className="border-t pt-4">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="コメントを入力..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <div className="mt-2 flex justify-end">
                  <button
                    onClick={handleAddComment}
                    disabled={!newComment.trim()}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    コメント追加
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* サイドバー */}
          <div className="space-y-6">
            {/* アクションボタン */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">操作</h2>
              <div className="space-y-3">
                {/* 提出ボタン（協力会社・下書きのみ） */}
                {canSubmit && (
                  <button
                    onClick={handleSubmit}
                    disabled={actionLoading}
                    className="w-full px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
                  >
                    {actionLoading ? '処理中...' : '提出する'}
                  </button>
                )}

                {/* 承認ボタン（社内・承認待ちのみ） */}
                {canApprove && (
                  <>
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        コメント（任意）
                      </label>
                      <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="承認コメントを入力..."
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <button
                      onClick={handleApprove}
                      disabled={actionLoading}
                      className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
                    >
                      {actionLoading ? '処理中...' : '承認する'}
                    </button>
                    <button
                      onClick={handleReturn}
                      disabled={actionLoading}
                      className="w-full px-4 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
                    >
                      {actionLoading ? '処理中...' : '差し戻す'}
                    </button>
                    <button
                      onClick={handleReject}
                      disabled={actionLoading}
                      className="w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
                    >
                      {actionLoading ? '処理中...' : '却下する'}
                    </button>
                  </>
                )}

                {/* PDFダウンロードボタン（将来実装） */}
                <button
                  disabled
                  className="w-full px-4 py-3 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed"
                  title="PDF生成機能は今後実装予定です"
                >
                  PDF ダウンロード（準備中）
                </button>
              </div>
            </div>

            {/* 承認履歴 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">承認履歴</h2>
              <div className="space-y-4">
                {invoice.approval_histories.length === 0 ? (
                  <p className="text-sm text-gray-500">履歴はありません</p>
                ) : (
                  invoice.approval_histories.map((history, index) => (
                    <div key={history.id} className="relative pl-6 pb-4">
                      {/* タイムライン */}
                      {index !== invoice.approval_histories.length - 1 && (
                        <div className="absolute left-2 top-6 bottom-0 w-0.5 bg-gray-200"></div>
                      )}
                      
                      {/* アイコン */}
                      <div className={`absolute left-0 top-1 w-4 h-4 rounded-full ${
                        history.action === 'approved' ? 'bg-green-500' :
                        history.action === 'rejected' ? 'bg-red-500' :
                        history.action === 'returned' ? 'bg-yellow-500' :
                        'bg-blue-500'
                      }`}></div>
                      
                      {/* 内容 */}
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-900">
                            {history.action_display}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatDateTime(history.timestamp)}
                          </span>
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          {history.user_name} ({history.user_position})
                        </div>
                        {history.step_name && (
                          <div className="text-xs text-gray-500 mt-1">
                            {history.step_name}
                          </div>
                        )}
                        {history.comment && (
                          <p className="text-sm text-gray-700 mt-2 bg-gray-50 p-2 rounded">
                            {history.comment}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 承認ルート情報 */}
            {invoice.approval_route_detail && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">承認フロー</h2>
                <div className="space-y-3">
                  {invoice.approval_route_detail.steps.map((step, index) => {
                    const isCurrentStep = invoice.current_approval_step === step.id;
                    const isPassed = invoice.approval_histories.some(
                      h => h.approval_step === step.id && h.action === 'approved'
                    );
                    
                    return (
                      <div
                        key={step.id}
                        className={`p-3 rounded-lg border-2 ${
                          isCurrentStep ? 'border-orange-500 bg-orange-50' :
                          isPassed ? 'border-green-500 bg-green-50' :
                          'border-gray-200 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              Step {step.step_order}: {step.step_name}
                            </div>
                            <div className="text-xs text-gray-600 mt-1">
                              {step.approver_name}
                            </div>
                          </div>
                          {isCurrentStep && (
                            <span className="px-2 py-1 text-xs bg-orange-500 text-white rounded">
                              現在
                            </span>
                          )}
                          {isPassed && (
                            <span className="px-2 py-1 text-xs bg-green-500 text-white rounded">
                              完了
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceDetailPage;