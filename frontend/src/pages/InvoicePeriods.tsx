// frontend/src/pages/InvoicePeriods.tsx
// 月次請求期間管理ページ（社内ユーザー専用）

import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface InvoicePeriod {
  id: number;
  year: number;
  month: number;
  period_name: string;
  deadline_date: string;
  is_closed: boolean;
  closed_by_name: string | null;
  closed_at: string | null;
  total_invoices: number;
  submitted_invoices: number;
  pending_invoices: number;
  status_display: string;
}

interface UnsubmittedCompany {
  id: number;
  name: string;
  contact_email: string;
}

const InvoicePeriods: React.FC = () => {
  const [periods, setPeriods] = useState<InvoicePeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewPeriodForm, setShowNewPeriodForm] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<InvoicePeriod | null>(null);
  const [unsubmittedCompanies, setUnsubmittedCompanies] = useState<UnsubmittedCompany[]>([]);
  const [showUnsubmittedModal, setShowUnsubmittedModal] = useState(false);

  // 新規期間フォーム
  const [newPeriod, setNewPeriod] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    deadline_date: '',
  });

  useEffect(() => {
    fetchPeriods();
  }, []);

  const fetchPeriods = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:8000/api/invoice-periods/', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPeriods(response.data.results || response.data);
      setLoading(false);
    } catch (error) {
      console.error('期間取得エラー:', error);
      setLoading(false);
    }
  };

  const handleCreatePeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        'http://localhost:8000/api/invoice-periods/',
        newPeriod,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('新しい請求期間を作成しました');
      setShowNewPeriodForm(false);
      fetchPeriods();
      setNewPeriod({
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1,
        deadline_date: '',
      });
    } catch (error: any) {
      alert('作成エラー: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleClosePeriod = async (periodId: number) => {
    if (!window.confirm('この期間を締めますか？締め後は協力会社が請求書を作成できなくなります。')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `http://localhost:8000/api/invoice-periods/${periodId}/close/`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert(response.data.message);
      fetchPeriods();
    } catch (error: any) {
      alert('締め処理エラー: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleReopenPeriod = async (periodId: number) => {
    if (!window.confirm('この期間を再開しますか？')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `http://localhost:8000/api/invoice-periods/${periodId}/reopen/`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert(response.data.message);
      fetchPeriods();
    } catch (error: any) {
      alert('再開エラー: ' + (error.response?.data?.error || error.message));
    }
  };

  const fetchUnsubmittedCompanies = async (periodId: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:8000/api/invoice-periods/${periodId}/unsubmitted_companies/`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUnsubmittedCompanies(response.data.unsubmitted_companies);
      setShowUnsubmittedModal(true);
    } catch (error) {
      console.error('未提出会社取得エラー:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* ヘッダー */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">月次請求期間管理</h1>
        <button
          onClick={() => setShowNewPeriodForm(true)}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          + 新規期間作成
        </button>
      </div>

      {/* 期間一覧 */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                期間
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                締切日
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                状態
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                請求書数
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                未提出
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                アクション
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {periods.map((period) => (
              <tr key={period.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {period.period_name}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">
                    {new Date(period.deadline_date).toLocaleDateString('ja-JP')}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      period.is_closed
                        ? 'bg-red-100 text-red-800'
                        : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {period.status_display}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {period.submitted_invoices} / {period.total_invoices}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => fetchUnsubmittedCompanies(period.id)}
                    className="text-sm text-blue-600 hover:text-blue-800 underline"
                  >
                    {period.pending_invoices}社
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {period.is_closed ? (
                    <button
                      onClick={() => handleReopenPeriod(period.id)}
                      className="text-green-600 hover:text-green-900 mr-3"
                    >
                      再開
                    </button>
                  ) : (
                    <button
                      onClick={() => handleClosePeriod(period.id)}
                      className="text-red-600 hover:text-red-900 mr-3"
                    >
                      締める
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 新規期間作成モーダル */}
      {showNewPeriodForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-6">新規請求期間作成</h2>
            <form onSubmit={handleCreatePeriod}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  年
                </label>
                <input
                  type="number"
                  value={newPeriod.year}
                  onChange={(e) =>
                    setNewPeriod({ ...newPeriod, year: parseInt(e.target.value) })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  月
                </label>
                <select
                  value={newPeriod.month}
                  onChange={(e) =>
                    setNewPeriod({ ...newPeriod, month: parseInt(e.target.value) })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                >
                  {[...Array(12)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {i + 1}月
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  締切日
                </label>
                <input
                  type="date"
                  value={newPeriod.deadline_date}
                  onChange={(e) =>
                    setNewPeriod({ ...newPeriod, deadline_date: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowNewPeriodForm(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  作成
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 未提出会社モーダル */}
      {showUnsubmittedModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6">未提出の協力会社</h2>
            {unsubmittedCompanies.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                全ての協力会社が提出済みです 🎉
              </p>
            ) : (
              <div className="space-y-3">
                {unsubmittedCompanies.map((company) => (
                  <div
                    key={company.id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                  >
                    <div className="font-medium text-gray-900">{company.name}</div>
                    <div className="text-sm text-gray-500 mt-1">
                      {company.contact_email}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowUnsubmittedModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoicePeriods;