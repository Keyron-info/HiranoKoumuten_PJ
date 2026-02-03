import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  CheckCircle, XCircle, Download, MessageSquare, Clock, User,
  Building2, Calendar, Edit3, ArrowLeft
} from 'lucide-react';
import { invoiceAPI } from '../api/invoices';
import Layout from '../components/common/Layout';
import { useAuth } from '../contexts/AuthContext';

interface InvoiceItem {
  id: number;
  item_number: number;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  amount: number;
}

interface ApprovalHistoryItem {
  id: number;
  action: string;
  action_display?: string;
  user_name?: string;
  comment: string;
  timestamp: string;
}

interface Correction {
  id: number;
  field_name: string;
  field_type_display: string;
  original_value: string;
  corrected_value: string;
  correction_reason: string;
  corrected_by_name: string;
  created_at: string;
  is_approved_by_partner: boolean;
}

interface InvoiceDetail {
  id: number;
  invoice_number: string;
  customer_company_name: string;
  receiving_company_name?: string;
  construction_site_name_display?: string;
  project_name?: string;
  construction_type_name?: string;
  invoice_date: string;
  billing_period_start?: string;
  billing_period_end?: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  status: string;
  status_display: string;
  created_at: string;
  submitted_at?: string;
  is_returned?: boolean;
  has_corrections?: boolean;
  can_partner_edit?: boolean;
  return_reason?: string;
  return_note?: string;
  partner_acknowledged_at?: string;
  partner_acknowledged_by?: number;
  items: InvoiceItem[];
  approval_histories?: ApprovalHistoryItem[];
  corrections?: Correction[];
}

const InvoiceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [comment, setComment] = useState('');
  const [processing, setProcessing] = useState(false);
  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [canDownloadPdf, setCanDownloadPdf] = useState(false);

  useEffect(() => {
    if (id) {
      fetchInvoice();
      checkPdfPermission();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      const data = await invoiceAPI.getInvoice(id!);
      setInvoice(data as unknown as InvoiceDetail);

      // 修正履歴を取得
      try {
        const correctionData = await invoiceAPI.getCorrections(id!);
        setCorrections(correctionData.results || []);
      } catch (error) {
        console.error('Failed to fetch corrections:', error);
      }
    } catch (error) {
      console.error('Failed to fetch invoice:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkPdfPermission = async () => {
    try {
      const result = await invoiceAPI.checkPdfPermission(id!);
      setCanDownloadPdf(result.can_download);
    } catch (error) {
      setCanDownloadPdf(false);
    }
  };

  const handleApprove = async () => {
    if (!id) return;
    try {
      setProcessing(true);
      await invoiceAPI.approveInvoice(id, comment);
      alert('承認しました');
      fetchInvoice();
    } catch (error: any) {
      alert(error.response?.data?.error || '承認に失敗しました');
    } finally {
      setProcessing(false);
    }
  };

  const handleAcknowledgeReturn = async () => {
    if (!id) return;
    if (!window.confirm('差し戻し内容を確認しました。承認すると経理承認段階へ進みます。よろしいですか？')) {
      return;
    }
    try {
      setProcessing(true);
      await invoiceAPI.acknowledgeReturn(id);
      alert('承認しました。経理承認段階へ進みます。');
      fetchInvoice();
    } catch (error: any) {
      alert(error.response?.data?.error || '承認処理に失敗しました');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      alert('却下理由を入力してください');
      return;
    }
    if (!id) return;

    try {
      setProcessing(true);
      await invoiceAPI.rejectInvoice(id, rejectReason);
      alert(`却下しました`);
      setShowRejectModal(false);
      fetchInvoice();
    } catch (error: any) {
      alert(error.response?.data?.error || '却下に失敗しました');
    } finally {
      setProcessing(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!canDownloadPdf) {
      alert('PDFダウンロード権限がありません。経理部門にお問い合わせください。');
      return;
    }
    try {
      // トークンを取得
      const token = localStorage.getItem('access_token');

      // ベースURLを構築（環境変数があれば使用、なければデフォルト）
      let apiBaseUrl = process.env.REACT_APP_API_URL || 'http://localhost:8001/api';
      // /api が含まれていない場合は追加
      if (!apiBaseUrl.includes('/api')) {
        apiBaseUrl = apiBaseUrl.replace(/\/$/, '') + '/api';
      }

      // PDFをダウンロード
      const response = await fetch(`${apiBaseUrl}/invoices/${id}/download_pdf/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        // エラーレスポンスがJSONかHTMLかを判定
        const contentType = response.headers.get('Content-Type') || '';
        if (contentType.includes('application/json')) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'PDFダウンロードに失敗しました');
        } else {
          throw new Error(`HTTPエラー: ${response.status}`);
        }
      }

      // PDFをBlobとして取得
      const blob = await response.blob();

      // ダウンロードリンクを作成
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice_${invoice?.invoice_number || id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

    } catch (error: any) {
      alert(error.message || 'PDFダウンロードに失敗しました');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ja-JP');
  };

  const formatDateTime = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('ja-JP');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle size={18} className="text-green-600" />;
      case 'submitted':
        return <CheckCircle size={18} className="text-green-600" />;
      case 'pending_approval':
        return <Clock size={18} className="text-primary-600" />;
      case 'returned':
      case 'rejected':
        return <XCircle size={18} className="text-red-600" />;
      default:
        return <User size={18} className="text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      </Layout>
    );
  }

  if (!invoice) {
    return (
      <Layout>
        <div className="max-w-6xl mx-auto px-4 py-8">
          <p className="text-center text-gray-500">請求書が見つかりません</p>
        </div>
      </Layout>
    );
  }

  const isInternalUser = user?.user_type === 'internal';
  const isPartnerUser = user?.user_type === 'customer';
  const isReturned = invoice.status === 'returned';
  const hasCorrections = corrections.length > 0;
  const workPeriod = invoice.billing_period_start && invoice.billing_period_end
    ? `${formatDate(invoice.billing_period_start)} - ${formatDate(invoice.billing_period_end)}`
    : '-';

  // 承認フロー定義
  const approvalSteps = [
    { step: '提出', role: 'partner', status: 'completed' },
    { step: '監督承認', role: 'supervisor', status: 'pending' },
    { step: '部門長承認', role: 'manager', status: 'waiting' },
    { step: '経理承認', role: 'accounting', status: 'waiting' },
    { step: '役員承認', role: 'executive', status: 'waiting' },
  ];

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* ヘッダー */}
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="text-blue-600 hover:text-blue-700 mb-4 flex items-center space-x-1"
          >
            <ArrowLeft size={16} />
            <span>戻る</span>
          </button>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{invoice.invoice_number}</h1>
              <span className={`inline-block px-4 py-2 rounded-lg text-sm font-medium border ${invoice.status === 'pending_approval' ? 'bg-primary-100 text-primary-700 border-primary-200' :
                  invoice.status === 'approved' ? 'bg-green-100 text-green-700 border-green-200' :
                    invoice.status === 'returned' ? 'bg-red-100 text-red-700 border-red-200' :
                      'bg-gray-100 text-gray-700 border-gray-200'
                }`}>
                {invoice.status_display}
              </span>
            </div>
            <button
              onClick={handleDownloadPdf}
              disabled={!canDownloadPdf}
              className={`flex items-center space-x-2 px-4 py-2 border rounded-lg transition-colors ${canDownloadPdf
                  ? 'bg-white border-gray-300 hover:bg-gray-50'
                  : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              title={canDownloadPdf ? 'PDFをダウンロード' : 'PDFダウンロード権限がありません'}
            >
              <Download size={20} />
              <span>PDFダウンロード</span>
            </button>
          </div>
        </div>

        {/* 差し戻し理由表示 */}
        {isReturned && invoice.return_reason && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">差し戻し理由</h3>
                <p className="mt-2 text-sm text-yellow-700">{invoice.return_reason}</p>
                {invoice.return_note && (
                  <p className="mt-1 text-sm text-yellow-600">備考: {invoice.return_note}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 修正履歴バナー */}
        {hasCorrections && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Edit3 size={20} className="text-red-600" />
              <h3 className="font-bold text-red-900">修正履歴あり</h3>
            </div>
            {corrections.map((correction, index) => (
              <div key={index} className="mt-3 bg-white p-4 rounded-lg">
                <p className="font-medium text-gray-900 mb-2">{correction.field_name}</p>
                <div className="space-y-1">
                  <p className="text-gray-500 line-through">{correction.original_value}</p>
                  <div className="flex items-center space-x-2">
                    <span className="text-red-600 font-bold text-lg">{correction.corrected_value}</span>
                    <Edit3 size={16} className="text-red-600" />
                  </div>
                  <p className="text-sm text-gray-700 mt-2">
                    <span className="font-medium">理由:</span> {correction.correction_reason}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {correction.corrected_by_name} - {formatDateTime(correction.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* メインコンテンツ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2 space-y-6">
            {/* 基本情報 */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">基本情報</h2>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-500 mb-1">協力会社</p>
                  <p className="font-medium text-gray-900 flex items-center space-x-2">
                    <Building2 size={18} className="text-gray-400" />
                    <span>{invoice.customer_company_name}</span>
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">工事名</p>
                  <p className="font-medium text-gray-900">
                    {invoice.construction_site_name_display || invoice.project_name || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">請求日</p>
                  <p className="font-medium text-gray-900 flex items-center space-x-2">
                    <Calendar size={18} className="text-gray-400" />
                    <span>{formatDate(invoice.invoice_date)}</span>
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">工事期間</p>
                  <p className="font-medium text-gray-900">{workPeriod}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">工種</p>
                  <p className="font-medium text-gray-900">{invoice.construction_type_name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">提出日時</p>
                  <p className="font-medium text-gray-900">{formatDateTime(invoice.submitted_at)}</p>
                </div>
              </div>
            </div>

            {/* 請求明細 */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">請求明細</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-200">
                      <th className="text-left py-3 px-2 text-sm font-medium text-gray-600">項目</th>
                      <th className="text-right py-3 px-2 text-sm font-medium text-gray-600">数量</th>
                      <th className="text-center py-3 px-2 text-sm font-medium text-gray-600">単位</th>
                      <th className="text-right py-3 px-2 text-sm font-medium text-gray-600">単価</th>
                      <th className="text-right py-3 px-2 text-sm font-medium text-gray-600">金額</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items?.map((item, index) => (
                      <tr key={index} className="border-b border-gray-100">
                        <td className="py-4 px-2 text-sm text-gray-900">{item.description}</td>
                        <td className="py-4 px-2 text-sm text-right text-gray-900">{Number(item.quantity).toLocaleString()}</td>
                        <td className="py-4 px-2 text-sm text-center text-gray-900">{item.unit}</td>
                        <td className="py-4 px-2 text-sm text-right text-gray-900">{formatCurrency(item.unit_price)}</td>
                        <td className="py-4 px-2 text-sm text-right font-medium text-gray-900">{formatCurrency(item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-300">
                      <td colSpan={4} className="py-3 px-2 text-right font-medium text-gray-700">小計</td>
                      <td className="py-3 px-2 text-right font-medium text-gray-900">{formatCurrency(invoice.subtotal)}</td>
                    </tr>
                    <tr>
                      <td colSpan={4} className="py-3 px-2 text-right font-medium text-gray-700">消費税（10%）</td>
                      <td className="py-3 px-2 text-right font-medium text-gray-900">{formatCurrency(invoice.tax_amount)}</td>
                    </tr>
                    <tr className="border-t border-gray-200">
                      <td colSpan={4} className="py-3 px-2 text-right font-bold text-gray-900 text-lg">合計</td>
                      <td className="py-3 px-2 text-right font-bold text-primary-600 text-xl">{formatCurrency(invoice.total_amount)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* コメント */}
            {isInternalUser && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center space-x-2">
                  <MessageSquare size={20} />
                  <span>コメント</span>
                </h2>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                  rows={4}
                  placeholder="承認時のコメントを入力してください（任意）"
                />
              </div>
            )}
          </div>

          {/* サイドバー */}
          <div className="space-y-6">
            {/* アクションボタン */}
            {isPartnerUser && isReturned ? (
              // 協力会社ユーザー & 差し戻し状態: 承認ボタンのみ
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">アクション</h2>
                <div className="space-y-3">
                  <button
                    onClick={handleAcknowledgeReturn}
                    disabled={processing}
                    className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-4 rounded-lg font-bold text-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    <CheckCircle size={24} />
                    <span>{processing ? '処理中...' : '差し戻し内容を承認'}</span>
                  </button>
                  <div className="text-sm text-gray-600 flex items-center mt-3 p-3 bg-gray-50 rounded-lg">
                    <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <span>内容修正が必要な場合は平野工務店へお問い合わせください</span>
                  </div>
                </div>
              </div>
            ) : isInternalUser && invoice.status === 'pending_approval' ? (
              // 平野工務店ユーザー & 承認待ち: 承認・差し戻し・却下ボタン
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">承認アクション</h2>
                <div className="space-y-3">
                  <button
                    onClick={handleApprove}
                    disabled={processing}
                    className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-4 rounded-lg font-bold text-lg hover:from-green-600 hover:to-green-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    <CheckCircle size={24} />
                    <span>{processing ? '処理中...' : '承認する'}</span>
                  </button>
                  {/* 差し戻し（赤ペン修正）ボタン */}
                  <button
                    onClick={() => navigate(`/invoices/${id}/edit-correction`)}
                    className="w-full bg-gradient-to-r from-primary-500 to-primary-600 text-white py-4 rounded-lg font-bold text-lg hover:from-primary-600 hover:to-primary-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center space-x-2"
                  >
                    <Edit3 size={24} />
                    <span>差し戻し（修正依頼）</span>
                  </button>
                  {/* 却下ボタン */}
                  <button
                    onClick={() => setShowRejectModal(true)}
                    disabled={processing}
                    className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white py-4 rounded-lg font-bold text-lg hover:from-red-600 hover:to-red-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    <XCircle size={24} />
                    <span>却下</span>
                  </button>
                </div>
              </div>
            ) : null}

            {/* 承認履歴 */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">承認履歴</h2>
              <div className="space-y-4">
                {invoice.approval_histories && invoice.approval_histories.length > 0 ? (
                  invoice.approval_histories.map((history, index) => (
                    <div key={index} className="relative">
                      {index !== invoice.approval_histories!.length - 1 && (
                        <div className="absolute left-4 top-10 bottom-0 w-0.5 bg-gray-200" />
                      )}
                      <div className="flex items-start space-x-3">
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${history.action === 'approved' || history.action === 'submitted'
                            ? 'bg-green-100 text-green-600'
                            : history.action === 'returned' || history.action === 'rejected'
                              ? 'bg-red-100 text-red-600'
                              : 'bg-primary-100 text-primary-600'
                          }`}>
                          {getStatusIcon(history.action)}
                        </div>
                        <div className="flex-1 pb-4">
                          <p className="font-medium text-gray-900 text-sm">{history.action_display || history.action}</p>
                          <p className="text-xs text-gray-600">{history.user_name || '不明'}</p>
                          <p className="text-xs text-gray-500 mt-1">{formatDateTime(history.timestamp)}</p>
                          {history.comment && (
                            <p className="text-xs text-gray-700 mt-2 bg-gray-50 p-2 rounded">{history.comment}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  // デフォルト承認フロー表示
                  approvalSteps.map((step, index) => (
                    <div key={index} className="relative">
                      {index !== approvalSteps.length - 1 && (
                        <div className="absolute left-4 top-10 bottom-0 w-0.5 bg-gray-200" />
                      )}
                      <div className="flex items-start space-x-3">
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${step.status === 'completed'
                            ? 'bg-green-100 text-green-600'
                            : step.status === 'pending'
                              ? 'bg-primary-100 text-primary-600'
                              : 'bg-gray-100 text-gray-400'
                          }`}>
                          {step.status === 'completed' ? (
                            <CheckCircle size={18} />
                          ) : step.status === 'pending' ? (
                            <Clock size={18} />
                          ) : (
                            <User size={18} />
                          )}
                        </div>
                        <div className="flex-1 pb-4">
                          <p className="font-medium text-gray-900 text-sm">{step.step}</p>
                          <p className="text-xs text-gray-600">
                            {step.status === 'completed' ? '完了' : step.status === 'pending' ? '待機中' : '未着手'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
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
                onClick={() => setShowRejectModal(false)}
                disabled={processing}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleReject}
                disabled={processing}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                {processing ? '処理中...' : '却下する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default InvoiceDetailPage;
