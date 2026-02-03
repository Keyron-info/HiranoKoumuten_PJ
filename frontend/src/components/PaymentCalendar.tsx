// frontend/src/components/PaymentCalendar.tsx

import React, { useState, useEffect } from 'react';
import { paymentCalendarAPI, CalendarMonth } from '../api/paymentCalendar';
import Layout from './common/Layout';

const PaymentCalendar: React.FC = () => {
  const [calendars, setCalendars] = useState<CalendarMonth[]>([]);
  const [loading, setLoading] = useState(true);
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    fetchCalendar();
  }, []);

  const fetchCalendar = async () => {
    try {
      const data = await paymentCalendarAPI.getCurrentYear();
      setCalendars(data);
    } catch (error) {
      console.error('カレンダーの取得に失敗しました:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      month: 'long',
      day: 'numeric'
    });
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
        <h1 className="text-2xl font-bold mb-6">{currentYear}年 支払いカレンダー</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {calendars.map(calendar => (
            <div
              key={calendar.id}
              className={`border rounded-lg p-4 ${calendar.is_non_standard_deadline
                ? 'border-primary-400 bg-primary-50'
                : 'border-gray-200 bg-white'
                }`}
            >
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-lg font-semibold">{calendar.month}月</h3>
                {calendar.is_non_standard_deadline && (
                  <span className="px-2 py-1 bg-primary-500 text-white text-xs rounded-full">
                    締め日変更
                  </span>
                )}
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">請求書締め日:</span>
                  <span className="font-medium">{formatDate(calendar.deadline_date)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">支払日:</span>
                  <span className="font-medium">{formatDate(calendar.payment_date)}</span>
                </div>
              </div>

              {calendar.is_holiday_period && calendar.holiday_note && (
                <div className="mt-3 p-2 bg-blue-50 border-l-4 border-blue-400 text-sm">
                  <p className="text-blue-800">{calendar.holiday_note}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default PaymentCalendar;

