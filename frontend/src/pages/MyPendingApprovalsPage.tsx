import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, FileText, Building2, Calendar, DollarSign, AlertCircle } from 'lucide-react';
import { invoiceAPI } from '../api/invoices';
import { InvoiceListItem } from '../types';
import Layout from '../components/common/Layout';
import { useAuth } from '../contexts/AuthContext';

const MyPendingApprovalsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [pendingApprovals, setPendingApprovals] = useState<InvoiceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [showRejectModal, setShowRejectModal] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    fetchPendingApprovals();
  }, []);

  const fetchPendingApprovals = async () => {
    try {
      setLoading(true);
      const response = await invoiceAPI.getMyPendingApprovals();
      setPendingApprovals(response.results || []);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch pending approvals:', err);
      setError('承認待ちの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (invoiceId: number) => {
    try {
      setProcessingId(invoiceId);
      await invoiceAPI.approveInvoice(String(invoiceId));
      alert('承認しました');
      fetchPendingApprovals();
    } catch (err: any) {
      alert(err.response?.data?.error || '承認に失敗しました');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (invoiceId: number) => {
    if (!rejectReason.trim()) {
      alert('却下理由を入力してください');
      return;
    }
    
    try {
      setProcessingId(invoiceId);
      await invoiceAPI.rejectInvoice(String(invoiceId), rejectReason);
      alert('却下しました');
      setShowRejectModal(null);
      setRejectReason('');
      fetchPendingApprovals();
    } catch (err: any) {
      alert(err.response?.data?.error || '却下に失敗しました');
    } finally {
      setProcessingId(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ja-JP');
  };

  const getDaysWaiting = (dateString: string | null) => {
    if (!dateString) return 0;
    const submitted = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now.getTime() - submitted.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      </Layout>
    );
  }

  const isEmpty = pendingApprovals.length === 0;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center space-x-3">
                <span>承認待ち</span>
                <span className="inline-flex items-center justify-center w-10 h-10 bg-orange-500 text-white rounded-full text-lg font-bold">
                  {pendingApprovals.length}
                </span>
              </h1>
              <p className="text-gray-600">
                {user?.first_name} {user?.last_name}さんの承認が必要な請求書一覧
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-700">
            {error}
          </div>
        )}

        {isEmpty ? (
          /* 空の状態 */
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
              <CheckCircle size={40} className="text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">承認待ちの請求書はありません</h3>
            <p className="text-gray-600">すべての請求書を確認済みです。お疲れ様でした。</p>
          </div>
        ) : (
          /* 承認待ちリスト */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {pendingApprovals.map((invoice) => {
              const daysWaiting = getDaysWaiting(invoice.submitted_at || invoice.created_at);
              
              return (
                <div 
                  key={invoice.id} 
                  className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border-l-4 border-orange-500"
                >
                  <div className="p-6">
                    {/* ヘッダー */}
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <FileText size={20} className="text-orange-600" />
                          <h3 className="text-lg font-bold text-gray-900">{invoice.invoice_number}</h3>
                        </div>
                        <span className="inline-block px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium border border-orange-200">
                          {invoice.status_display}
                        </span>
                      </div>
                      {daysWaiting > 3 && (
                        <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium flex items-center space-x-1">
                          <AlertCircle size={12} />
                          <span>{daysWaiting}日経過</span>
                        </span>
                      )}
                    </div>
                    
                    {/* 詳細情報 */}
                    <div className="space-y-3 mb-6">
                      <div className="flex items-center space-x-3 text-gray-700">
                        <Building2 size={18} className="text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-500">協力会社</p>
                          <p className="font-medium">{invoice.customer_company_name}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3 text-gray-700">
                        <FileText size={18} className="text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-500">工事名</p>
                          <p className="font-medium">
                            {invoice.construction_site_name_display || invoice.project_name || '-'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 text-gray-700">
                          <Calendar size={18} className="text-gray-400" />
                          <div>
                            <p className="text-sm text-gray-500">提出日</p>
                            <p className="font-medium">{formatDate(invoice.submitted_at || invoice.created_at)}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3 text-gray-700">
                          <DollarSign size={18} className="text-gray-400" />
                          <div className="text-right">
                            <p className="text-sm text-gray-500">請求金額</p>
                            <p className="text-xl font-bold text-orange-600">{formatCurrency(invoice.total_amount)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* アクションボタン */}
                    <div className="flex space-x-3">
                      <button 
                        onClick={() => handleApprove(invoice.id)}
                        disabled={processingId === invoice.id}
                        className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white py-3 rounded-lg font-medium hover:from-green-600 hover:to-green-700 transition-all shadow-sm hover:shadow-md flex items-center justify-center space-x-2 disabled:opacity-50"
                      >
                        <CheckCircle size={20} />
                        <span>{processingId === invoice.id ? '処理中...' : '承認する'}</span>
                      </button>
                      <button 
                        onClick={() => setShowRejectModal(invoice.id)}
                        disabled={processingId === invoice.id}
                        className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white py-3 rounded-lg font-medium hover:from-red-600 hover:to-red-700 transition-all shadow-sm hover:shadow-md flex items-center justify-center space-x-2 disabled:opacity-50"
                      >
                        <XCircle size={20} />
                        <span>却下</span>
                      </button>
                    </div>
                    
                    {/* 詳細リンク */}
                    <button 
                      onClick={() => navigate(`/invoices/${invoice.id}`)}
                      className="w-full mt-3 text-blue-600 hover:text-blue-700 font-medium text-sm py-2 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      詳細を見る →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 却下モーダル */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">却下理由を入力</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
              rows={4}
              placeholder="却下の理由を入力してください（必須）"
            />
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowRejectModal(null);
                  setRejectReason('');
                }}
                disabled={processingId !== null}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={() => handleReject(showRejectModal)}
                disabled={processingId !== null}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {processingId !== null ? '処理中...' : '却下する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default MyPendingApprovalsPage;
