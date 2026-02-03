import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle, MessageSquare, Edit3, AlertCircle, ArrowLeft } from 'lucide-react';
import { invoiceAPI } from '../api/invoices';
import Layout from '../components/common/Layout';

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

interface InvoiceData {
  id: number;
  invoice_number: string;
  customer_company_name: string;
  construction_site_name_display?: string;
  project_name?: string;
  total_amount: number;
  status: string;
  status_display: string;
  is_returned: boolean;
  has_corrections: boolean;
  corrections: Correction[];
}

const InvoiceCorrectionReviewPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showInquiryDialog, setShowInquiryDialog] = useState(false);
  const [inquiryMessage, setInquiryMessage] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (id) {
      fetchInvoiceData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchInvoiceData = async () => {
    try {
      setLoading(true);
      const data = await invoiceAPI.getPartnerView(id!);

      // corrections が API から返ってこない場合、別途取得
      if (!data.corrections || data.corrections.length === 0) {
        try {
          const correctionsData = await invoiceAPI.getCorrections(id!);
          data.corrections = correctionsData.results || [];
        } catch (error) {
          data.corrections = [];
        }
      }

      setInvoice(data);
    } catch (error) {
      console.error('Failed to fetch invoice:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!id) return;

    try {
      setProcessing(true);
      await invoiceAPI.approveCorrections(id);
      alert('修正内容を承認しました。再度承認フローが開始されます。');
      setShowApproveDialog(false);
      navigate('/invoices');
    } catch (error: any) {
      console.error('Failed to approve corrections:', error);
      alert(error.response?.data?.error || '承認に失敗しました');
    } finally {
      setProcessing(false);
    }
  };

  const handleInquiry = async () => {
    if (!inquiryMessage.trim()) {
      alert('問い合わせ内容を入力してください');
      return;
    }

    try {
      setProcessing(true);
      await invoiceAPI.addComment(id!, inquiryMessage, 'correction', false);
      alert('問い合わせを送信しました');
      setShowInquiryDialog(false);
      setInquiryMessage('');
    } catch (error) {
      console.error('Failed to send inquiry:', error);
      alert('問い合わせの送信に失敗しました');
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
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
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center py-12">
            <p className="text-gray-500">請求書が見つかりません</p>
            <button
              onClick={() => navigate('/invoices')}
              className="mt-4 text-primary-600 hover:text-primary-700"
            >
              請求書一覧に戻る
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const corrections = invoice.corrections || [];

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* 戻るボタン */}
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="text-blue-600 hover:text-blue-700 mb-4 flex items-center space-x-1"
          >
            <ArrowLeft size={16} />
            <span>戻る</span>
          </button>
          <div className="flex items-center space-x-3 mb-2">
            <Edit3 size={32} className="text-primary-600" />
            <h1 className="text-3xl font-bold text-gray-900">請求書の修正確認</h1>
          </div>
          <p className="text-gray-600">{invoice.invoice_number} - {invoice.customer_company_name}</p>
        </div>

        {/* 通知バナー */}
        <div className="bg-primary-50 border-l-4 border-primary-500 p-6 mb-8 rounded-lg">
          <div className="flex items-start space-x-3">
            <AlertCircle size={24} className="text-primary-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-bold text-primary-900 text-lg mb-2">
                平野工務店より請求書の修正依頼が入りました
              </h3>
              <p className="text-primary-800">
                内容をご確認いただき、問題なければ「承認」をお願いいたします。
                承認後、請求書は再度平野工務店の承認フローに進みます。
              </p>
              <p className="text-primary-700 text-sm mt-2">
                ※ 修正内容に異議がある場合は「問い合わせ」からご連絡ください。
              </p>
            </div>
          </div>
        </div>

        {/* 修正内容 */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center space-x-2">
            <Edit3 size={24} className="text-red-600" />
            <span>修正内容</span>
          </h2>

          {corrections.length === 0 ? (
            <p className="text-gray-500 text-center py-8">修正内容がありません</p>
          ) : (
            <div className="space-y-6">
              {corrections.map((correction, index) => (
                <div key={index} className="bg-red-50 p-6 rounded-lg border-2 border-red-200">
                  <h3 className="font-bold text-gray-900 text-lg mb-4">
                    {correction.field_name} ({correction.field_type_display})
                  </h3>
                  <div className="space-y-4">
                    {/* 修正前 */}
                    <div>
                      <p className="text-sm text-gray-600 mb-2">修正前</p>
                      <div className="bg-white px-4 py-3 rounded border border-gray-300">
                        <p className="text-gray-500 line-through text-lg">{correction.original_value}</p>
                      </div>
                    </div>

                    {/* 矢印 */}
                    <div className="flex justify-center">
                      <div className="text-3xl text-red-600 font-bold">↓</div>
                    </div>

                    {/* 修正後 */}
                    <div>
                      <p className="text-sm font-medium text-red-600 mb-2 flex items-center space-x-1">
                        <Edit3 size={16} />
                        <span>修正後</span>
                      </p>
                      <div className="bg-white px-4 py-3 rounded border-2 border-red-500">
                        <div className="flex items-center space-x-2">
                          <p className="text-red-600 font-bold text-xl">{correction.corrected_value}</p>
                          <Edit3 size={20} className="text-red-600" />
                        </div>
                      </div>
                    </div>

                    {/* 修正理由 */}
                    <div className="bg-white p-4 rounded border border-red-200">
                      <p className="text-sm font-medium text-gray-700 mb-2">修正理由</p>
                      <p className="text-gray-900">{correction.correction_reason}</p>
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-xs text-gray-500">
                          修正者: {correction.corrected_by_name}
                        </p>
                        <p className="text-xs text-gray-500">
                          修正日時: {formatDate(correction.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 注意事項 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
          <div className="flex items-start space-x-2">
            <AlertCircle size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-medium mb-1">承認後の流れ:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>修正内容を承認</li>
                <li>請求書が平野工務店の承認フローに戻る</li>
                <li>監督 → 部門長 → 経理 → 役員の順に承認</li>
                <li>全承認後、支払い処理</li>
              </ol>
            </div>
          </div>
        </div>

        {/* アクションボタン */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">アクション</h2>
          <div className="space-y-3">
            <button
              onClick={() => setShowApproveDialog(true)}
              disabled={corrections.length === 0}
              className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-4 rounded-lg font-bold text-lg hover:from-green-600 hover:to-green-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle size={24} />
              <span>修正内容を承認する</span>
            </button>
            <button
              onClick={() => setShowInquiryDialog(true)}
              className="w-full bg-gradient-to-r from-primary-500 to-primary-600 text-white py-4 rounded-lg font-bold text-lg hover:from-primary-600 hover:to-primary-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center space-x-2"
            >
              <MessageSquare size={24} />
              <span>修正内容について問い合わせる</span>
            </button>
          </div>
        </div>
      </div>

      {/* 承認ダイアログ */}
      {showApproveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <CheckCircle size={32} className="text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">修正内容の承認</h3>
              <p className="text-gray-600">
                修正内容を承認します。よろしいですか？
              </p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-900">
                承認後、請求書は再度承認フローに入ります。最終的な支払いまでお時間をいただく場合がございます。
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowApproveDialog(false)}
                disabled={processing}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleApprove}
                disabled={processing}
                className="flex-1 px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-bold disabled:opacity-50"
              >
                {processing ? '処理中...' : '承認する'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 問い合わせダイアログ */}
      {showInquiryDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6">
            <div className="flex items-center space-x-3 mb-4">
              <MessageSquare size={24} className="text-primary-600" />
              <h3 className="text-xl font-bold text-gray-900">修正内容について問い合わせ</h3>
            </div>
            <p className="text-gray-600 mb-4">
              修正内容についてご不明な点があればお知らせください。担当者より折り返しご連絡いたします。
            </p>

            {/* 修正サマリー */}
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <h4 className="font-medium text-gray-900 mb-2">修正内容サマリー</h4>
              <ul className="text-sm text-gray-700 space-y-1">
                {corrections.map((correction, index) => (
                  <li key={index}>
                    • {correction.field_name}: {correction.original_value} → {correction.corrected_value}
                  </li>
                ))}
              </ul>
            </div>

            <textarea
              value={inquiryMessage}
              onChange={(e) => setInquiryMessage(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              rows={5}
              placeholder={`問い合わせ内容を入力してください\n\n例：\n・請求金額が減額された理由をもう少し詳しく教えてください\n・工事期間の変更について確認させてください`}
            />
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowInquiryDialog(false)}
                disabled={processing}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleInquiry}
                disabled={processing}
                className="flex-1 px-4 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors font-bold disabled:opacity-50"
              >
                {processing ? '送信中...' : '送信する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default InvoiceCorrectionReviewPage;

