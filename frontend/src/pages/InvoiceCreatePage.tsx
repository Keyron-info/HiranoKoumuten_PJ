import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoiceAPI } from '../api/invoices';
import { InvoiceCreateForm, ConstructionSite, InvoiceItem } from '../types';
import Layout from '../components/common/Layout';

const InvoiceCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [sites, setSites] = useState<ConstructionSite[]>([]);
  const [formData, setFormData] = useState<InvoiceCreateForm>({
    construction_site: '',
    project_name: '',
    invoice_date: new Date().toISOString().split('T')[0],
    payment_due_date: '',
    notes: '',
    items: [{ item_number: 1, description: '', quantity: 1, unit: '式', unit_price: 0, amount: 0 }],
  });

  useEffect(() => {
    fetchSites();
  }, []);

  const fetchSites = async () => {
    try {
      const data = await invoiceAPI.getConstructionSites();
      setSites(data);
    } catch (error) {
      console.error('Failed to fetch sites:', error);
    }
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
    try {
      const invoice = await invoiceAPI.createInvoice(formData);
      navigate(`/invoices/${invoice.id}`);
    } catch (error) {
      console.error('Failed to create invoice:', error);
      alert('請求書の作成に失敗しました');
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">請求書作成</h1>

        <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">工事現場</label>
            <select
              required
              value={formData.construction_site}
              onChange={(e) => setFormData({ ...formData, construction_site: e.target.value })}
              className="input-field"
            >
              <option value="">選択してください</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>{site.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">請求日</label>
              <input
                type="date"
                required
                value={formData.invoice_date}
                onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">支払予定日</label>
              <input
                type="date"
                required
                value={formData.payment_due_date}
                onChange={(e) => setFormData({ ...formData, payment_due_date: e.target.value })}
                className="input-field"
              />
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-2">明細</h3>
            {formData.items.map((item, index) => (
              <div key={index} className="grid grid-cols-5 gap-2 mb-2">
                <input
                  placeholder="品名"
                  value={item.description}
                  onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                  className="input-field col-span-2"
                  required
                />
                <input
                  type="number"
                  placeholder="数量"
                  value={item.quantity}
                  onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                  className="input-field"
                  required
                />
                <input
                  type="number"
                  placeholder="単価"
                  value={item.unit_price}
                  onChange={(e) => handleItemChange(index, 'unit_price', Number(e.target.value))}
                  className="input-field"
                  required
                />
                <input
                  type="number"
                  placeholder="金額"
                  value={item.amount}
                  className="input-field"
                  disabled
                />
              </div>
            ))}
            <button type="button" onClick={handleAddItem} className="btn-secondary mt-2">明細を追加</button>
          </div>

          <div className="flex gap-4">
            <button type="submit" className="btn-primary">作成</button>
            <button type="button" onClick={() => navigate('/invoices')} className="btn-secondary">キャンセル</button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default InvoiceCreatePage;