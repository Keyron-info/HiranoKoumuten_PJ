import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Edit3, Eye, Save, AlertCircle, ArrowLeft } from 'lucide-react';
import { invoiceAPI } from '../api/invoices';
import Layout from '../components/common/Layout';

interface CorrectionField {
  field: string;
  fieldKey: string;
  fieldType: string;
  originalValue: string;
  newValue: string;
  reason: string;
  itemId?: number;
}

interface InvoiceItem {
  id: number;
  item_number: number;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  amount: number;
}

interface InvoiceData {
  id: number;
  invoice_number: string;
  customer_company_name: string;
  construction_site_name_display?: string;
  project_name?: string;
  invoice_date: string;
  billing_period_start?: string;
  billing_period_end?: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  items: InvoiceItem[];
}

const InvoiceEditWithCorrectionPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewMode, setPreviewMode] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [corrections, setCorrections] = useState<Record<string, CorrectionField>>({});

  useEffect(() => {
    if (id) {
      fetchInvoice();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      const data = await invoiceAPI.getInvoice(id!);
      setInvoice(data as unknown as InvoiceData);
    } catch (error) {
      console.error('Failed to fetch invoice:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCorrection = (
    field: string, 
    fieldKey: string,
    fieldType: string,
    originalValue: string, 
    newValue: string, 
    reason: string,
    itemId?: number
  ) => {
    if (newValue !== originalValue && newValue.trim() !== '') {
      setCorrections({
        ...corrections,
        [fieldKey]: { field, fieldKey, fieldType, originalValue, newValue, reason, itemId },
      });
    } else {
      const newCorrections = { ...corrections };
      delete newCorrections[fieldKey];
      setCorrections(newCorrections);
    }
  };

  const handleSave = async () => {
    if (Object.keys(corrections).length === 0) {
      alert('修正内容がありません');
      return;
    }

    const hasEmptyReasons = Object.values(corrections).some((c) => !c.reason.trim());
    if (hasEmptyReasons) {
      alert('すべての修正項目に理由を入力してください');
      return;
    }

    setShowConfirmDialog(true);
  };

  const confirmSave = async () => {
    try {
      setProcessing(true);
      
      // 各修正を保存
      for (const correction of Object.values(corrections)) {
        await invoiceAPI.addCorrection(id!, {
          invoice_item: correction.itemId,
          field_name: correction.field,
          field_type: correction.fieldType,
          original_value: correction.originalValue,
          corrected_value: correction.newValue,
          correction_reason: correction.reason,
        });
      }

      // 差し戻し処理
      await invoiceAPI.returnToPartner(id!, '請求書の修正を行いました。修正内容をご確認ください。');
      
      alert('修正を保存して協力会社に通知しました');
      setShowConfirmDialog(false);
      navigate(`/invoices/${id}`);
    } catch (error: any) {
      console.error('Failed to save corrections:', error);
      alert(error.response?.data?.error || '修正の保存に失敗しました');
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ja-JP');
  };

  const formatCurrency = (amount: number) => {
    return `¥${amount.toLocaleString()}`;
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

  if (!invoice) {
    return (
      <Layout>
        <div className="max-w-6xl mx-auto px-4 py-8">
          <p className="text-center text-gray-500">請求書が見つかりません</p>
        </div>
      </Layout>
    );
  }

  const hasCorrections = Object.keys(corrections).length > 0;
  const workPeriod = invoice.billing_period_start && invoice.billing_period_end
    ? `${formatDate(invoice.billing_period_start)} - ${formatDate(invoice.billing_period_end)}`
    : '-';

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
              <div className="flex items-center space-x-3 mb-2">
                <Edit3 size={32} className="text-orange-600" />
                <h1 className="text-3xl font-bold text-gray-900">差し戻し（修正依頼）</h1>
              </div>
              <p className="text-gray-600">{invoice.invoice_number} - {invoice.customer_company_name}</p>
            </div>
            <button
              onClick={() => setPreviewMode(!previewMode)}
              className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Eye size={20} />
              <span>{previewMode ? '編集モード' : 'プレビュー'}</span>
            </button>
          </div>
        </div>

        {/* 修正件数バナー */}
        {hasCorrections && !previewMode && (
          <div className="bg-orange-50 border-l-4 border-orange-500 p-4 mb-6 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertCircle size={20} className="text-orange-600" />
              <p className="text-orange-900 font-medium">
                {Object.keys(corrections).length}件の修正があります
              </p>
            </div>
          </div>
        )}

        {!previewMode ? (
          /* 編集モード */
          <div className="space-y-6">
            {/* 基本情報の修正 */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">基本情報の修正</h2>
              <div className="space-y-6">
                <CorrectionInput
                  label="請求金額"
                  originalValue={formatCurrency(invoice.subtotal)}
                  fieldKey="amount"
                  fieldType="amount"
                  corrections={corrections}
                  onCorrection={handleCorrection}
                />
                <CorrectionInput
                  label="消費税"
                  originalValue={formatCurrency(invoice.tax_amount)}
                  fieldKey="tax"
                  fieldType="amount"
                  corrections={corrections}
                  onCorrection={handleCorrection}
                />
                <CorrectionInput
                  label="工事期間"
                  originalValue={workPeriod}
                  fieldKey="workPeriod"
                  fieldType="other"
                  corrections={corrections}
                  onCorrection={handleCorrection}
                />
                <CorrectionInput
                  label="請求日"
                  originalValue={formatDate(invoice.invoice_date)}
                  fieldKey="invoiceDate"
                  fieldType="other"
                  corrections={corrections}
                  onCorrection={handleCorrection}
                />
              </div>
            </div>

            {/* 請求明細の修正 */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">請求明細の修正</h2>
              <p className="text-sm text-gray-600 mb-4">
                個別の明細項目を修正する場合は、各項目の値を変更してください
              </p>
              {invoice.items?.map((item, index) => (
                <div key={index} className="mb-6 pb-6 border-b border-gray-200 last:border-b-0">
                  <h3 className="font-medium text-gray-900 mb-4">明細 {index + 1}: {item.description}</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <CorrectionInput
                      label="数量"
                      originalValue={item.quantity.toString()}
                      fieldKey={`item_${item.id}_quantity`}
                      fieldType="quantity"
                      corrections={corrections}
                      onCorrection={handleCorrection}
                      itemId={item.id}
                    />
                    <CorrectionInput
                      label="単価"
                      originalValue={formatCurrency(item.unit_price)}
                      fieldKey={`item_${item.id}_unitPrice`}
                      fieldType="unit_price"
                      corrections={corrections}
                      onCorrection={handleCorrection}
                      itemId={item.id}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* アクションボタン */}
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => navigate(-1)}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleSave}
                disabled={!hasCorrections}
                className="px-8 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg hover:shadow-xl font-bold flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={20} />
                <span>修正を保存して協力会社に通知</span>
              </button>
            </div>
          </div>
        ) : (
          /* プレビューモード */
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">修正内容プレビュー</h2>
            {Object.keys(corrections).length === 0 ? (
              <p className="text-center text-gray-500 py-8">修正内容がありません</p>
            ) : (
              <div className="space-y-6">
                {Object.values(corrections).map((correction, index) => (
                  <div key={index} className="bg-red-50 p-4 rounded-lg border border-red-200">
                    <p className="font-medium text-gray-900 mb-3">{correction.field}</p>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-500 line-through">{correction.originalValue}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-2xl">↓</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-red-600 font-bold text-lg">{correction.newValue}</span>
                        <Edit3 size={18} className="text-red-600" />
                      </div>
                      <div className="mt-3 pt-3 border-t border-red-200">
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">修正理由:</span> {correction.reason}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 確認ダイアログ */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">修正内容の確認</h3>
            <p className="text-gray-700 mb-6">
              この修正内容で協力会社に通知します。よろしいですか？
            </p>
            <div className="bg-gray-50 p-4 rounded-lg mb-6 max-h-64 overflow-y-auto">
              {Object.values(corrections).map((correction, index) => (
                <div key={index} className="mb-3 pb-3 border-b border-gray-200 last:border-b-0">
                  <p className="font-medium text-sm text-gray-900">{correction.field}</p>
                  <p className="text-sm text-gray-600">
                    {correction.originalValue} → <span className="text-red-600 font-bold">{correction.newValue}</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{correction.reason}</p>
                </div>
              ))}
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowConfirmDialog(false)}
                disabled={processing}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={confirmSave}
                disabled={processing}
                className="flex-1 px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-bold disabled:opacity-50"
              >
                {processing ? '送信中...' : '通知する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

// 修正入力コンポーネント
interface CorrectionInputProps {
  label: string;
  originalValue: string;
  fieldKey: string;
  fieldType: string;
  corrections: Record<string, CorrectionField>;
  onCorrection: (
    field: string, 
    fieldKey: string,
    fieldType: string,
    originalValue: string, 
    newValue: string, 
    reason: string,
    itemId?: number
  ) => void;
  itemId?: number;
}

const CorrectionInput: React.FC<CorrectionInputProps> = ({ 
  label, 
  originalValue, 
  fieldKey,
  fieldType,
  corrections, 
  onCorrection,
  itemId
}) => {
  const [newValue, setNewValue] = useState('');
  const [reason, setReason] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const hasCorrection = corrections[fieldKey];

  const handleApply = () => {
    if (newValue && newValue !== originalValue) {
      onCorrection(label, fieldKey, fieldType, originalValue, newValue, reason, itemId);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setNewValue('');
    setReason('');
    setIsEditing(false);
    onCorrection(label, fieldKey, fieldType, originalValue, originalValue, '', itemId);
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <label className="block text-sm font-medium text-gray-700 mb-3">{label}</label>
      <div className="space-y-3">
        {/* 元の値 */}
        <div>
          <p className="text-xs text-gray-500 mb-1">元の値</p>
          <div className={`px-4 py-2 bg-gray-50 rounded border ${hasCorrection ? 'line-through text-gray-400' : 'border-gray-200 text-gray-900'}`}>
            {originalValue}
          </div>
        </div>
        
        {isEditing || hasCorrection ? (
          <>
            {/* 矢印 */}
            <div className="flex items-center justify-center">
              <span className="text-2xl text-gray-400">↓</span>
            </div>
            
            {/* 修正値 */}
            <div>
              <p className="text-xs font-medium text-red-600 mb-1 flex items-center space-x-1">
                <Edit3 size={14} />
                <span>修正値</span>
              </p>
              <input
                type="text"
                value={hasCorrection ? corrections[fieldKey].newValue : newValue}
                onChange={(e) => setNewValue(e.target.value)}
                disabled={!!hasCorrection}
                placeholder="修正後の値を入力"
                className="w-full px-4 py-2 border-2 border-red-300 rounded focus:ring-2 focus:ring-red-500 focus:border-transparent text-red-600 font-bold disabled:bg-red-50"
              />
            </div>
            
            {/* 修正理由 */}
            <div>
              <p className="text-xs font-medium text-gray-700 mb-1">修正理由（必須）</p>
              <textarea
                value={hasCorrection ? corrections[fieldKey].reason : reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={!!hasCorrection}
                placeholder="修正理由を入力してください"
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none disabled:bg-gray-50"
              />
            </div>
            
            {/* ボタン */}
            {!hasCorrection && (
              <div className="flex space-x-2">
                <button
                  onClick={handleApply}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors text-sm font-medium"
                >
                  適用
                </button>
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors text-sm"
                >
                  キャンセル
                </button>
              </div>
            )}
            {hasCorrection && (
              <button
                onClick={handleCancel}
                className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors text-sm"
              >
                修正を取り消す
              </button>
            )}
          </>
        ) : (
          /* 修正開始ボタン */
          <button
            onClick={() => setIsEditing(true)}
            className="w-full px-4 py-2 border-2 border-dashed border-orange-300 text-orange-600 rounded hover:border-orange-500 hover:bg-orange-50 transition-colors text-sm font-medium flex items-center justify-center space-x-2"
          >
            <Edit3 size={16} />
            <span>この項目を修正する</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default InvoiceEditWithCorrectionPage;

