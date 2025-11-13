// frontend/src/pages/InvoiceCreatePage.tsx
// 完全版（そのままコピペOK）

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoiceAPI } from '../api/invoices';
import { InvoiceCreateForm, ConstructionSite, InvoiceItem } from '../types';
import Layout from '../components/common/Layout';
import { useAuth } from '../contexts/AuthContext';
import TemplateSelector from '../components/TemplateSelector';

const InvoiceCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sites, setSites] = useState<ConstructionSite[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
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

  const unitOptions = ['式', '個', 'm', 'm²', 'm³', 't', 'kg', 'L'];

  useEffect(() => {
    fetchSites();
  }, []);

  const fetchSites = async () => {
    try {
      const response: any = await invoiceAPI.getConstructionSites();
      console.log('Construction sites response:', response);
      
      if (Array.isArray(response)) {
        setSites(response);
      } else if (response && typeof response === 'object') {
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

  const getSelectedSite = (): ConstructionSite | undefined => {
    if (!formData.construction_site) return undefined;
    return sites.find(site => site.id.toString() === formData.construction_site.toString());
  };

  const selectedSite = getSelectedSite();

  const calculateTotals = () => {
    const subtotal = formData.items.reduce((sum, item) => sum + item.amount, 0);
    const taxAmount = Math.floor(subtotal * 0.1);
    const totalAmount = subtotal + taxAmount;
    return { subtotal, taxAmount, totalAmount };
  };

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

  const handleRemoveItem = (index: number) => {
    if (formData.items.length === 1) {
      alert('最低1つの明細が必要です');
      return;
    }
    const newItems = formData.items.filter((_, i) => i !== index);
    const reindexedItems = newItems.map((item, i) => ({
      ...item,
      item_number: i + 1,
    }));
    setFormData({ ...formData, items: reindexedItems });
  };

  const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    if (field === 'quantity' || field === 'unit_price') {
      newItems[index].amount = newItems[index].quantity * newItems[index].unit_price;
    }
    
    setFormData({ ...formData, items: newItems });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
      };
      
      const invoice = await invoiceAPI.createInvoice(submitData);
      alert('請求書を作成しました');
      navigate(`/invoices/${invoice.id}`);
    } catch (error: any) {
      console.error('Failed to create invoice:', error);
      const errorMessage = error.response?.data?.message || '請求書の作成に失敗しました';
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const { subtotal, taxAmount, totalAmount } = calculateTotals();

  const getCompanyName = () => {
    if (!user) return '会社名未設定';
    
    if ('company_name' in user && user.company_name) {
      return user.company_name;
    }
    
    if ('customer_company_name' in user && user.customer_company_name) {
      return user.customer_company_name;
    }
    
    const userWithCompany = user as any;
    if (userWithCompany.company && userWithCompany.company.name) {
      return userWithCompany.company.name;
    }
    
    return '会社名未設定';
  };

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">請求書作成</h1>
          <p className="mt-2 text-sm text-gray-600">
            請求書情報を入力してください。下書き保存または提出できます。
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">基本情報</h2>
            
            <div className="mb-6 p-4 bg-gray-50 rounded-md">
              <h3 className="text-sm font-medium text-gray-700 mb-2">請求元</h3>
              <p className="text-sm text-gray-900">{getCompanyName()}</p>
              {user?.email && <p className="text-xs text-gray-600 mt-1">{user.email}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  工事現場 <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.construction_site}
                  onChange={(e) => setFormData({ ...formData, construction_site: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
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
                {sites.length === 0 && (
                  <p className="mt-1 text-xs text-red-500">
                    工事現場が登録されていません。管理者に連絡してください。
                  </p>
                )}

                {selectedSite && (
                  <div className="mt-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-blue-900">
                          {selectedSite.name}
                        </p>
                        {selectedSite.location && (
                          <p className="text-sm text-blue-700 mt-1">
                            📍 {selectedSite.location}
                          </p>
                        )}
                        {selectedSite.supervisor_name && (
                          <p className="text-sm text-blue-700 mt-1">
                            👤 現場監督: <span className="font-medium">{selectedSite.supervisor_name}</span>
                          </p>
                        )}
                        {selectedSite.supervisor_name && (
                          <p className="text-xs text-blue-600 mt-2">
                            💡 この請求書は {selectedSite.supervisor_name} が最初に承認します
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="md:col-span-2">
                <TemplateSelector
                  onSelect={(templateId) => setSelectedTemplate(templateId)}
                  selectedTemplateId={selectedTemplate}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  工事名
                </label>
                <input
                  type="text"
                  value={formData.project_name}
                  onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
                  placeholder="例: 外壁塗装工事"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div></div>

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
                      <td className="px-2 py-2 text-sm text-gray-600">
                        {item.item_number}
                      </td>

                      <td className="px-2 py-2">
                        <input
                          type="text"
                          placeholder="例: 土工事"
                          value={item.description}
                          onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                          required
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-orange-500"
                        />
                      </td>

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

                      <td className="px-2 py-2">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={item.unit_price}
                          onChange={(e) => handleItemChange(index, 'unit_price', Number(e.target.value))}
                          required
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-right focus:outline-none focus:ring-1 focus:ring-orange-500"
                        />
                      </td>

                      <td className="px-2 py-2">
                        <div className="text-sm text-right font-medium text-gray-900">
                          ¥{item.amount.toLocaleString()}
                        </div>
                      </td>

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
      </div>
    </Layout>
  );
};

export default InvoiceCreatePage;