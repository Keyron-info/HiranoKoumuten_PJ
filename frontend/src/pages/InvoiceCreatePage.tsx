import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoiceAPI, constructionTypeAPI, purchaseOrderAPI, constructionSiteAPI } from '../api/invoices';
import { InvoiceCreateForm, ConstructionSite, InvoiceItem, ConstructionType, PurchaseOrder } from '../types';
import Layout from '../components/common/Layout';
import { useAuth } from '../contexts/AuthContext';
import InvoiceSuccessModal from '../components/InvoiceSuccessModal';

const InvoiceCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sites, setSites] = useState<ConstructionSite[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedTemplate] = useState<number | null>(null);

  // 🆕 Phase 3: 工種・注文書
  const [constructionTypes, setConstructionTypes] = useState<ConstructionType[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [documentType, setDocumentType] = useState<'invoice' | 'delivery_note'>('invoice');
  const [selectedConstructionType, setSelectedConstructionType] = useState<number | null>(null);
  const [constructionTypeOther, setConstructionTypeOther] = useState<string>('');
  const [selectedPurchaseOrder, setSelectedPurchaseOrder] = useState<number | null>(null);

  // 🆕 前回入力値・よく使う項目
  const [lastInput, setLastInput] = useState<any>(null);
  const [frequentItems, setFrequentItems] = useState<{ description: string; count: number }[]>([]);
  const [showLastInputBanner, setShowLastInputBanner] = useState(false);
  const [sitePassword, setSitePassword] = useState('');

  const [formData, setFormData] = useState<InvoiceCreateForm>({
    construction_site: '',
    project_name: '',
    invoice_date: new Date().toISOString().split('T')[0],
    payment_due_date: '',
    notes: '',
    items: [{
      item_number: 1,
      description: '',
      quantity: 1,
      unit: '式',
      unit_price: 0,
      amount: 0
    }],
  });

  // 単位の選択肢
  const unitOptions = ['式', '個', 'm', 'm²', 'm³', 't', 'kg', 'L'];

  useEffect(() => {
    fetchSites();
    fetchConstructionTypes();
    fetchLastInput();
    fetchFrequentItems();
  }, []);

  // 🆕 前回入力値を取得
  const fetchLastInput = async () => {
    try {
      const data = await invoiceAPI.getLastInput();
      if (data.has_previous) {
        setLastInput(data);
        setShowLastInputBanner(true);
      }
    } catch (error) {
      console.error('Failed to fetch last input:', error);
    }
  };

  // 🆕 よく使う明細項目を取得
  const fetchFrequentItems = async () => {
    try {
      const data = await invoiceAPI.getFrequentItems();
      setFrequentItems(data.frequent_items || []);
    } catch (error) {
      console.error('Failed to fetch frequent items:', error);
    }
  };

  // 🆕 前回の入力値を適用
  const applyLastInput = () => {
    if (!lastInput) return;

    if (lastInput.construction_site) {
      setFormData(prev => ({ ...prev, construction_site: String(lastInput.construction_site) }));
    }
    if (lastInput.construction_type) {
      setSelectedConstructionType(lastInput.construction_type);
    }
    if (lastInput.construction_type_other) {
      setConstructionTypeOther(lastInput.construction_type_other);
    }
    if (lastInput.notes) {
      setFormData(prev => ({ ...prev, notes: lastInput.notes }));
    }
    setShowLastInputBanner(false);
  };

  // 工事現場が選択されたら、その現場の注文書を取得
  useEffect(() => {
    if (formData.construction_site) {
      fetchPurchaseOrders(formData.construction_site);
    }
  }, [formData.construction_site]);

  // 🆕 現場パスワード認証
  const handleVerifyPassword = async () => {
    if (!sitePassword) {
      alert('パスワードを入力してください');
      return;
    }

    try {
      setLoading(true);
      const site = await constructionSiteAPI.verifyPassword(sitePassword);

      // 検索成功：現場リストに設定して選択状態にする
      setSites([site]);
      setFormData(prev => ({ ...prev, construction_site: site.id }));
    } catch (error: any) {
      console.error('Password verification failed:', error);
      const msg = error.response?.data?.error || '認証に失敗しました';
      alert(msg);
      setSites([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchSites = async () => {
    // 協力会社の場合は全件取得しない（パスワード検索のみ）
    if (user?.user_type === 'customer') {
      return;
    }

    try {
      const response: any = await invoiceAPI.getConstructionSites();
      console.log('Construction sites response:', response);

      // レスポンスが配列かオブジェクトか判定
      if (Array.isArray(response)) {
        setSites(response);
      } else if (response && typeof response === 'object') {
        // response.results または response.data をチェック
        const results = (response as any).results;
        const data = (response as any).data;

        if (Array.isArray(results)) {
          setSites(results);
        } else if (Array.isArray(data)) {
          setSites(data);
        } else {
          console.error('Unexpected response format:', response);
          setSites([]);
          alert('工事現場データの形式が正しくありません');
        }
      } else {
        console.error('Unexpected response type:', typeof response);
        setSites([]);
        alert('工事現場データの取得に失敗しました');
      }
    } catch (error: any) {
      console.error('Failed to fetch sites:', error);
      setSites([]);
      alert('工事現場の取得に失敗しました');
    }
  };

  // 🆕 工種マスタ取得
  const fetchConstructionTypes = async () => {
    try {
      const types = await constructionTypeAPI.getTypes();
      // 配列であることを確認
      if (Array.isArray(types)) {
        setConstructionTypes(types);
      } else {
        console.error('Construction types is not an array:', types);
        setConstructionTypes([]);
      }
    } catch (error) {
      console.error('Failed to fetch construction types:', error);
      setConstructionTypes([]);
    }
  };

  // 🆕 注文書取得
  const fetchPurchaseOrders = async (siteId: string) => {
    try {
      const orders = await purchaseOrderAPI.getOrders({ construction_site: siteId });
      setPurchaseOrders(orders);
    } catch (error) {
      console.error('Failed to fetch purchase orders:', error);
      setPurchaseOrders([]);
    }
  };

  // 選択された工事現場を取得
  const getSelectedSite = (): ConstructionSite | undefined => {
    if (!formData.construction_site) return undefined;
    return sites.find(site => site.id.toString() === formData.construction_site.toString());
  };

  const selectedSite = getSelectedSite();

  // 金額計算
  const calculateTotals = () => {
    const subtotal = formData.items.reduce((sum, item) => sum + item.amount, 0);
    const taxAmount = Math.floor(subtotal * 0.1); // 消費税10%
    const totalAmount = subtotal + taxAmount;
    return { subtotal, taxAmount, totalAmount };
  };

  // 明細追加
  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, {
        item_number: formData.items.length + 1,
        description: '',
        quantity: 1,
        unit: '式',
        unit_price: 0,
        amount: 0,
      }],
    });
  };

  // 明細削除
  const handleRemoveItem = (index: number) => {
    if (formData.items.length === 1) {
      alert('最低1つの明細が必要です');
      return;
    }
    const newItems = formData.items.filter((_, i) => i !== index);
    // item_numberを振り直す
    const reindexedItems = newItems.map((item, i) => ({
      ...item,
      item_number: i + 1,
    }));
    setFormData({ ...formData, items: reindexedItems });
  };

  // 明細変更
  const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };

    // 数量または単価が変更された場合、金額を再計算
    if (field === 'quantity' || field === 'unit_price') {
      const quantity = Number(newItems[index].quantity) || 0;
      const unitPrice = Number(newItems[index].unit_price) || 0;
      newItems[index].amount = quantity * unitPrice;
    }

    setFormData({ ...formData, items: newItems });
  };

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdInvoiceId, setCreatedInvoiceId] = useState<string | null>(null);
  const [createdInvoiceNumber, setCreatedInvoiceNumber] = useState<string>('');

  // 権限チェック (協力会社のみアクセス可能)
  useEffect(() => {
    if (user && user.user_type !== 'customer') {
      alert('請求書作成は協力会社様のみ可能です');
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // フォーム送信
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // バリデーション
    if (!formData.construction_site) {
      alert('工事現場を選択してください');
      return;
    }

    if (!formData.payment_due_date) {
      alert('支払予定日を入力してください');
      return;
    }

    const hasEmptyDescription = formData.items.some(item => !item.description.trim());
    if (hasEmptyDescription) {
      alert('全ての明細に品名を入力してください');
      return;
    }

    setLoading(true);
    try {
      const submitData = {
        ...formData,
        template: selectedTemplate,
        document_type: documentType,
        construction_type: selectedConstructionType,
        construction_type_other: constructionTypeOther,
        purchase_order: selectedPurchaseOrder,
      };
      const invoice = await invoiceAPI.createInvoice(submitData as any);

      // モーダル表示
      setCreatedInvoiceId(invoice.id);
      setCreatedInvoiceNumber(invoice.invoice_number);
      setShowSuccessModal(true);

    } catch (error: any) {
      console.error('Failed to create invoice:', error);
      const errorMessage = error.response?.data?.message || '請求書の作成に失敗しました';
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const { subtotal, taxAmount, totalAmount } = calculateTotals();

  // ユーザー情報から会社名を取得（安全に）
  const getCompanyName = () => {
    if (!user) return '会社名未設定';

    // user.company_name が存在するか確認
    if ('company_name' in user && user.company_name) {
      return user.company_name;
    }

    // user.customer_company_name が存在するか確認
    if ('customer_company_name' in user && user.customer_company_name) {
      return user.customer_company_name;
    }

    // user.company.name が存在するか確認（型アサーション）
    const userWithCompany = user as any;
    if (userWithCompany.company && userWithCompany.company.name) {
      return userWithCompany.company.name;
    }

    return '会社名未設定';
  };

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ヘッダー */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">請求書作成</h1>
          <p className="mt-2 text-sm text-gray-600">
            請求書情報を入力してください。下書き保存または提出できます。
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 🆕 前回入力値使用バナー */}
          {showLastInputBanner && lastInput && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">💡</span>
                <div>
                  <p className="font-medium text-blue-900">前回の入力内容を使用しますか？</p>
                  <p className="text-sm text-blue-700">
                    前回の請求書: {lastInput.last_invoice_number}
                    ({lastInput.last_created_at ? new Date(lastInput.last_created_at).toLocaleDateString('ja-JP') : ''})
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={applyLastInput}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  使用する
                </button>
                <button
                  type="button"
                  onClick={() => setShowLastInputBanner(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
                >
                  閉じる
                </button>
              </div>
            </div>
          )}

          {/* 基本情報カード */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">基本情報</h2>

            {/* 請求元情報（読み取り専用） */}
            <div className="mb-6 p-4 bg-gray-50 rounded-md">
              <h3 className="text-sm font-medium text-gray-700 mb-2">請求元</h3>
              <p className="text-sm text-gray-900">{getCompanyName()}</p>
              {user?.email && <p className="text-xs text-gray-600 mt-1">{user.email}</p>}
            </div>

            {/* 🆕 書類タイプ選択 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">書類タイプ</label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="documentType"
                    value="invoice"
                    checked={documentType === 'invoice'}
                    onChange={() => setDocumentType('invoice')}
                    className="mr-2 text-orange-500 focus:ring-orange-500"
                  />
                  <span className="text-sm">請求書</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="documentType"
                    value="delivery_note"
                    checked={documentType === 'delivery_note'}
                    onChange={() => setDocumentType('delivery_note')}
                    className="mr-2 text-orange-500 focus:ring-orange-500"
                  />
                  <span className="text-sm">納品書</span>
                </label>
              </div>
              {documentType === 'delivery_note' && (
                <p className="text-xs text-blue-600 mt-2">💡 納品書は承認不要で受領のみとなります</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 🆕 工事名を最上部に配置 */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  工事名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.project_name}
                  onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
                  placeholder="例: ○○様邸外壁塗装工事"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-lg"
                />
              </div>

              {/* 🆕 工種（15種類から選択） */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  工種 <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={selectedConstructionType || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSelectedConstructionType(value ? Number(value) : null);
                    if (value !== 'other') {
                      setConstructionTypeOther('');
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">選択してください</option>
                  {constructionTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                      {type.usage_count > 0 && ` (${type.usage_count}回使用)`}
                    </option>
                  ))}
                  <option value="other">その他</option>
                </select>
              </div>

              {/* 🆕 工種（その他）入力 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  工種（その他の場合）
                </label>
                <input
                  type="text"
                  value={constructionTypeOther}
                  onChange={(e) => setConstructionTypeOther(e.target.value)}
                  placeholder="その他の工種名を入力"
                  disabled={selectedConstructionType !== null && String(selectedConstructionType) !== 'other'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>

              {/* 工事現場 */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  工事現場 <span className="text-red-500">*</span>
                </label>

                {/* 協力会社向け: 現場パスワード認証 */}
                {user?.user_type === 'customer' && !formData.construction_site ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={sitePassword}
                      onChange={(e) => setSitePassword(e.target.value)}
                      placeholder="現場パスワードを入力してください"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    <button
                      type="button"
                      onClick={handleVerifyPassword}
                      className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 transition-colors"
                    >
                      検索
                    </button>
                  </div>
                ) : (
                  /* 社内ユーザーまたは認証済み: ドロップダウン表示 */
                  <div className="flex gap-2">
                    <select
                      required
                      value={formData.construction_site}
                      onChange={(e) => {
                        setFormData({ ...formData, construction_site: e.target.value });
                        setSelectedPurchaseOrder(null);
                      }}
                      disabled={user?.user_type === 'customer'} // 協力会社は変更不可（再検索が必要）
                      className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 ${user?.user_type === 'customer' ? 'bg-gray-100' : ''}`}
                    >
                      <option value="">選択してください</option>
                      {sites && sites.length > 0 ? (
                        sites.map((site) => (
                          <option key={site.id} value={site.id}>
                            {site.name}
                            {site.supervisor_name && ` - 担当: ${site.supervisor_name}`}
                          </option>
                        ))
                      ) : (
                        <option value="" disabled>工事現場がありません</option>
                      )}
                    </select>
                    {user?.user_type === 'customer' && (
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, construction_site: '' });
                          setSitePassword('');
                          setSites([]); // 検索結果をクリア
                        }}
                        className="px-3 py-2 border border-gray-300 text-gray-600 rounded-md hover:bg-gray-50 whitespace-nowrap"
                      >
                        再検索
                      </button>
                    )}
                  </div>
                )}

                {sites.length === 0 && user?.user_type !== 'customer' && (
                  <p className="mt-1 text-xs text-red-500">
                    工事現場が登録されていません。管理者に連絡してください。
                  </p>
                )}

                {/* 選択された工事現場の詳細表示 */}
                {selectedSite && (
                  <div className="mt-3 p-4 bg-orange-50 border border-orange-200 rounded-lg animate-fade-in">
                    <div className="flex items-start space-x-2">
                      <svg className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-orange-900">
                          {selectedSite.name}
                        </p>
                        {selectedSite.location && (
                          <p className="text-sm text-orange-700 mt-1">
                            📍 {selectedSite.location}
                          </p>
                        )}
                        {selectedSite.supervisor_name && (
                          <p className="text-sm text-orange-700 mt-1">
                            👤 現場監督: <span className="font-medium">{selectedSite.supervisor_name}</span>
                          </p>
                        )}
                        {selectedSite.supervisor_name && documentType === 'invoice' && (
                          <p className="text-xs text-orange-600 mt-2">
                            💡 この請求書は {selectedSite.supervisor_name} が最初に承認します
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 🆕 注文書選択 */}
              {purchaseOrders.length > 0 && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    注文書（紐付け）
                  </label>
                  <select
                    value={selectedPurchaseOrder || ''}
                    onChange={(e) => setSelectedPurchaseOrder(e.target.value ? Number(e.target.value) : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">注文書なし（選択しない）</option>
                    {purchaseOrders.map((order) => (
                      <option key={order.id} value={order.id}>
                        {order.order_number} - ¥{order.total_amount.toLocaleString()}
                        {order.remaining_amount > 0 && ` (残: ¥${order.remaining_amount.toLocaleString()})`}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    注文書を選択すると、金額の自動照合が行われます
                  </p>
                </div>
              )}

              {/* 請求日 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  請求日 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.invoice_date}
                  onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* 支払予定日 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  支払予定日 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.payment_due_date}
                  onChange={(e) => setFormData({ ...formData, payment_due_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            {/* 備考 */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                備考
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                placeholder="特記事項があれば入力してください"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          {/* 請求明細カード */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">請求明細</h2>
              <button
                type="button"
                onClick={handleAddItem}
                className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors text-sm flex items-center gap-1"
              >
                <span className="text-lg">+</span>
                明細を追加
              </button>
            </div>

            {/* 明細テーブル */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-700 w-8">#</th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-700">品名 *</th>
                    <th className="px-2 py-3 text-right text-xs font-medium text-gray-700 w-20">数量</th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-700 w-20">単位</th>
                    <th className="px-2 py-3 text-right text-xs font-medium text-gray-700 w-28">単価</th>
                    <th className="px-2 py-3 text-right text-xs font-medium text-gray-700 w-32">金額</th>
                    <th className="px-2 py-3 w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {formData.items.map((item, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      {/* 行番号 */}
                      <td className="px-2 py-2 text-sm text-gray-600">
                        {item.item_number}
                      </td>

                      {/* 品名 */}
                      <td className="px-2 py-2">
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="例: 土工事"
                            value={item.description}
                            onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                            list={`frequent-items-${index}`}
                            required
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-orange-500"
                          />
                          {/* よく使う項目のデータリスト */}
                          <datalist id={`frequent-items-${index}`}>
                            {frequentItems.map((fi, i) => (
                              <option key={i} value={fi.description}>
                                {fi.description} ({fi.count}回使用)
                              </option>
                            ))}
                          </datalist>
                        </div>
                      </td>

                      {/* 数量 */}
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                          required
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-right focus:outline-none focus:ring-1 focus:ring-orange-500"
                        />
                      </td>

                      {/* 単位 */}
                      <td className="px-2 py-2">
                        <select
                          value={item.unit}
                          onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-orange-500"
                        >
                          {unitOptions.map((unit) => (
                            <option key={unit} value={unit}>
                              {unit}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* 単価 */}
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={item.unit_price || ''}
                          onChange={(e) => handleItemChange(index, 'unit_price', e.target.value === '' ? 0 : Number(e.target.value))}
                          placeholder="単価を入力"
                          required
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-right focus:outline-none focus:ring-1 focus:ring-orange-500 placeholder-gray-400"
                        />
                      </td>

                      {/* 金額（自動計算） */}
                      <td className="px-2 py-2">
                        <div className="text-sm text-right font-medium text-gray-900">
                          ¥{item.amount.toLocaleString()}
                        </div>
                      </td>

                      {/* 削除ボタン */}
                      <td className="px-2 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          disabled={formData.items.length === 1}
                          className="text-red-600 hover:text-red-800 disabled:text-gray-400 disabled:cursor-not-allowed text-sm px-2"
                          title="削除"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 金額合計 */}
            <div className="mt-6 border-t pt-4">
              <div className="flex flex-col items-end space-y-2">
                <div className="flex justify-between w-64">
                  <span className="text-sm text-gray-700">小計</span>
                  <span className="text-sm font-medium text-gray-900">
                    ¥{subtotal.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between w-64">
                  <span className="text-sm text-gray-700">消費税 (10%)</span>
                  <span className="text-sm font-medium text-gray-900">
                    ¥{taxAmount.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between w-64 pt-2 border-t">
                  <span className="text-lg font-bold text-gray-900">合計</span>
                  <span className="text-lg font-bold text-orange-600">
                    ¥{totalAmount.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* アクションボタン */}
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => navigate('/invoices')}
              disabled={loading}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={loading || sites.length === 0}
              className="px-6 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  作成中...
                </>
              ) : (
                '請求書を作成'
              )}
            </button>
          </div>
        </form>
        {showSuccessModal && createdInvoiceId && (
          <InvoiceSuccessModal
            invoiceNumber={createdInvoiceNumber}
            onClose={() => {
              setShowSuccessModal(false);
              navigate('/invoices');
            }}
            onViewDetails={() => navigate(`/invoices/${createdInvoiceId}`)}
          />
        )}
      </div>
    </Layout>
  );
};

export default InvoiceCreatePage;