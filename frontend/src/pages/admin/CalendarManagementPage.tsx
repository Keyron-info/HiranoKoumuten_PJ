// frontend/src/pages/admin/CalendarManagementPage.tsx

import React, { useState, useEffect } from 'react';
import { paymentCalendarAPI, CalendarMonth, DeadlineBanner } from '../../api/paymentCalendar';
import Layout from '../../components/common/Layout';

interface CalendarFormData {
  year: number;
  month: number;
  payment_date: string;
  deadline_date: string;
  is_holiday_period: boolean;
  holiday_note: string;
}

interface BannerFormData {
  target_year: number;
  target_month: number;
  message_template: string;
  period_name: string;
  custom_message: string;
  is_active: boolean;
}

const CalendarManagementPage: React.FC = () => {
  const [calendars, setCalendars] = useState<CalendarMonth[]>([]);
  const [banners, setBanners] = useState<DeadlineBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCalendar, setEditingCalendar] = useState<CalendarMonth | null>(null);
  const [editingBanner, setEditingBanner] = useState<DeadlineBanner | null>(null);
  const [showCalendarForm, setShowCalendarForm] = useState(false);
  const [showBannerForm, setShowBannerForm] = useState(false);
  const [calendarFormData, setCalendarFormData] = useState<CalendarFormData>({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    payment_date: '',
    deadline_date: '',
    is_holiday_period: false,
    holiday_note: '',
  });
  const [bannerFormData, setBannerFormData] = useState<BannerFormData>({
    target_year: new Date().getFullYear(),
    target_month: new Date().getMonth() + 1,
    message_template: 'いつもありがとうございます。{period}のため、請求書の締め日を{deadline_date}とさせていただきます。',
    period_name: '',
    custom_message: '',
    is_active: false,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [calendarData, bannerData] = await Promise.all([
        paymentCalendarAPI.getCalendars(),
        paymentCalendarAPI.getBanners(),
      ]);
      setCalendars(calendarData);
      setBanners(bannerData);
    } catch (error) {
      console.error('データ取得エラー:', error);
      alert('データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleCalendarSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCalendar) {
        await paymentCalendarAPI.updateCalendar(editingCalendar.id, calendarFormData);
        alert('カレンダーを更新しました');
      } else {
        await paymentCalendarAPI.createCalendar(calendarFormData);
        alert('カレンダーを作成しました');
      }
      setShowCalendarForm(false);
      setEditingCalendar(null);
      fetchData();
    } catch (error: any) {
      alert(`保存に失敗しました: ${error.response?.data?.detail || error.message}`);
    }
  };

  const handleBannerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingBanner) {
        await paymentCalendarAPI.updateBanner(editingBanner.id, bannerFormData);
        alert('バナーを更新しました');
      } else {
        await paymentCalendarAPI.createBanner(bannerFormData);
        alert('バナーを作成しました');
      }
      setShowBannerForm(false);
      setEditingBanner(null);
      fetchData();
    } catch (error: any) {
      alert(`保存に失敗しました: ${error.response?.data?.detail || error.message}`);
    }
  };

  const handleEditCalendar = (calendar: CalendarMonth) => {
    setEditingCalendar(calendar);
    setCalendarFormData({
      year: calendar.year,
      month: calendar.month,
      payment_date: calendar.payment_date,
      deadline_date: calendar.deadline_date,
      is_holiday_period: calendar.is_holiday_period,
      holiday_note: calendar.holiday_note || '',
    });
    setShowCalendarForm(true);
  };

  const handleEditBanner = async (banner: DeadlineBanner) => {
    try {
      const data = await paymentCalendarAPI.getBanner(banner.id);
      setEditingBanner(banner);
      setBannerFormData({
        target_year: data.target_year,
        target_month: data.target_month,
        message_template: data.message_template || bannerFormData.message_template,
        period_name: data.period_name || '',
        custom_message: data.custom_message || '',
        is_active: data.is_active,
      });
      setShowBannerForm(true);
    } catch (error) {
      console.error('バナー詳細取得エラー:', error);
      alert('バナーの詳細取得に失敗しました');
    }
  };

  const handleDeleteBanner = async (id: number) => {
    if (!window.confirm('このバナーを削除しますか？')) {
      return;
    }
    try {
      await paymentCalendarAPI.deleteBanner(id);
      alert('バナーを削除しました');
      fetchData();
    } catch (error) {
      alert('削除に失敗しました');
    }
  };

  const getPreviewMessage = () => {
    if (bannerFormData.custom_message) {
      return bannerFormData.custom_message;
    }
    const calendar = calendars.find(
      c => c.year === bannerFormData.target_year && c.month === bannerFormData.target_month
    );
    if (calendar) {
      const deadlineDate = new Date(calendar.deadline_date).toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      return bannerFormData.message_template
        .replace('{period}', bannerFormData.period_name || '期間名')
        .replace('{deadline_date}', deadlineDate);
    }
    return bannerFormData.message_template
      .replace('{period}', bannerFormData.period_name || '期間名')
      .replace('{deadline_date}', 'YYYY年MM月DD日');
  };

  if (loading) {
    return (
      <Layout>
        <div className="p-8 text-center">読み込み中...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-6">支払いカレンダー管理</h1>

        {/* カレンダー編集セクション */}
        <section className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">年間カレンダー設定</h2>
            <button
              onClick={() => {
                setEditingCalendar(null);
                setCalendarFormData({
                  year: new Date().getFullYear(),
                  month: new Date().getMonth() + 1,
                  payment_date: '',
                  deadline_date: '',
                  is_holiday_period: false,
                  holiday_note: '',
                });
                setShowCalendarForm(true);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              新規作成
            </button>
          </div>

          <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">年月</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">締め日</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">支払日</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">休暇期間</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">アクション</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {calendars.map(calendar => (
                  <tr key={calendar.id} className={calendar.is_non_standard_deadline ? 'bg-primary-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {calendar.year}年{calendar.month}月
                      {calendar.is_non_standard_deadline && (
                        <span className="ml-2 px-2 py-1 bg-primary-500 text-white text-xs rounded-full">
                          締め日変更
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(calendar.deadline_date).toLocaleDateString('ja-JP')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(calendar.payment_date).toLocaleDateString('ja-JP')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {calendar.is_holiday_period ? '✓' : '-'}
                      {calendar.holiday_note && (
                        <div className="text-xs text-gray-500 mt-1">{calendar.holiday_note}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleEditCalendar(calendar)}
                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        編集
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* バナー編集セクション */}
        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">締め日変更バナー設定</h2>
            <button
              onClick={() => {
                setEditingBanner(null);
                setBannerFormData({
                  target_year: new Date().getFullYear(),
                  target_month: new Date().getMonth() + 1,
                  message_template: 'いつもありがとうございます。{period}のため、請求書の締め日を{deadline_date}とさせていただきます。',
                  period_name: '',
                  custom_message: '',
                  is_active: false,
                });
                setShowBannerForm(true);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              新規作成
            </button>
          </div>

          <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">対象年月</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">期間名</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ステータス</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">メッセージ</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">アクション</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {banners.map(banner => (
                  <tr key={banner.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {banner.target_year}年{banner.target_month}月
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {banner.period_name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${banner.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                        }`}>
                        {banner.is_active ? '表示中' : '非表示'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div className="max-w-md truncate">{banner.display_message}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                      <button
                        onClick={() => handleEditBanner(banner)}
                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        編集
                      </button>
                      <button
                        onClick={() => handleDeleteBanner(banner.id)}
                        className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        削除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* カレンダー編集モーダル */}
        {showCalendarForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4">
                {editingCalendar ? 'カレンダー編集' : 'カレンダー新規作成'}
              </h2>
              <form onSubmit={handleCalendarSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">年</label>
                    <input
                      type="number"
                      value={calendarFormData.year}
                      onChange={(e) => setCalendarFormData({ ...calendarFormData, year: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">月</label>
                    <input
                      type="number"
                      min="1"
                      max="12"
                      value={calendarFormData.month}
                      onChange={(e) => setCalendarFormData({ ...calendarFormData, month: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">請求書締め日</label>
                  <input
                    type="date"
                    value={calendarFormData.deadline_date}
                    onChange={(e) => setCalendarFormData({ ...calendarFormData, deadline_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">支払日</label>
                  <input
                    type="date"
                    value={calendarFormData.payment_date}
                    onChange={(e) => setCalendarFormData({ ...calendarFormData, payment_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_holiday_period"
                    checked={calendarFormData.is_holiday_period}
                    onChange={(e) => setCalendarFormData({ ...calendarFormData, is_holiday_period: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="is_holiday_period" className="ml-2 block text-sm text-gray-700">
                    休暇期間フラグ
                  </label>
                </div>
                {calendarFormData.is_holiday_period && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">休暇に関するお知らせ</label>
                    <textarea
                      value={calendarFormData.holiday_note}
                      onChange={(e) => setCalendarFormData({ ...calendarFormData, holiday_note: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                )}
                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    保存
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCalendarForm(false);
                      setEditingCalendar(null);
                    }}
                    className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                  >
                    キャンセル
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* バナー編集モーダル */}
        {showBannerForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4">
                {editingBanner ? 'バナー編集' : 'バナー新規作成'}
              </h2>
              <form onSubmit={handleBannerSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">対象年</label>
                    <input
                      type="number"
                      value={bannerFormData.target_year}
                      onChange={(e) => setBannerFormData({ ...bannerFormData, target_year: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">対象月</label>
                    <input
                      type="number"
                      min="1"
                      max="12"
                      value={bannerFormData.target_month}
                      onChange={(e) => setBannerFormData({ ...bannerFormData, target_month: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">期間名</label>
                  <input
                    type="text"
                    value={bannerFormData.period_name}
                    onChange={(e) => setBannerFormData({ ...bannerFormData, period_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="例: 年末年始、ゴールデンウィーク"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    メッセージテンプレート
                    <span className="text-xs text-gray-500 ml-2">（{'{period}'}と{'{deadline_date}'}が自動置換されます）</span>
                  </label>
                  <textarea
                    value={bannerFormData.message_template}
                    onChange={(e) => setBannerFormData({ ...bannerFormData, message_template: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    カスタムメッセージ
                    <span className="text-xs text-gray-500 ml-2">（指定した場合、テンプレートより優先されます）</span>
                  </label>
                  <textarea
                    value={bannerFormData.custom_message}
                    onChange={(e) => setBannerFormData({ ...bannerFormData, custom_message: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="カスタムメッセージを入力（任意）"
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={bannerFormData.is_active}
                    onChange={(e) => setBannerFormData({ ...bannerFormData, is_active: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="is_active" className="ml-2 block text-sm text-gray-700">
                    表示中（アクティブ）
                  </label>
                </div>

                {/* プレビュー */}
                <div className="bg-primary-50 border-l-4 border-primary-400 p-4 rounded">
                  <h3 className="text-sm font-medium text-primary-800 mb-2">プレビュー</h3>
                  <p className="text-sm text-primary-700">{getPreviewMessage()}</p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    保存
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowBannerForm(false);
                      setEditingBanner(null);
                    }}
                    className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                  >
                    キャンセル
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default CalendarManagementPage;

