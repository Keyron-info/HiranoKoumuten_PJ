// frontend/src/components/DeadlineNotificationBanner.tsx

import React, { useState, useEffect } from 'react';
import { paymentCalendarAPI, DeadlineBanner } from '../api/paymentCalendar';

const DeadlineNotificationBanner: React.FC = () => {
  const [banner, setBanner] = useState<DeadlineBanner | null>(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    fetchActiveBanner();
  }, []);

  const fetchActiveBanner = async () => {
    try {
      const activeBanner = await paymentCalendarAPI.getActiveBanner();
      if (activeBanner) {
        setBanner(activeBanner);

        // セッションストレージで閉じた状態を管理
        // 生成されたバナー(id<0)は毎回表示したいので保存しない、または別キーにする
        // ここでは通常バナーと同じ扱いで一旦閉じる
        const bannerKey = `banner_closed_${activeBanner.id}`;
        const isClosed = sessionStorage.getItem(bannerKey) === 'true';
        setIsVisible(!isClosed);
      }
    } catch (error) {
      setBanner(null);
    }
  };

  const handleClose = () => {
    if (banner) {
      sessionStorage.setItem(`banner_closed_${banner.id}`, 'true');
      setIsVisible(false);
    }
  };

  if (!banner || !isVisible) {
    return null;
  }

  // 締め日が25日以外（例外）かどうか判定
  // 生成バナーの場合 (id < 0) や カスタムメッセージで判定
  // ここではシンプルに、カスタムバナー(id > 0) または メッセージに「25日」が含まれていない場合を「重要」扱いにするなど工夫が可能
  // 今回は「カスタムバナー」＝「例外的なお知らせ」として目立たせる方針、
  // または生成バナーでも25日以外なら赤くするなど。
  // ここではシンプルに全てオレンジだが、カスタムなら赤にする例
  const isImportant = banner.id > 0; // カスタムバナーは重要扱い
  const bgColorClass = isImportant ? 'bg-gradient-to-r from-red-500 to-red-600' : 'bg-gradient-to-r from-primary-500 to-primary-600';

  return (
    <div className={`${bgColorClass} text-white shadow-lg`}>
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1">
            <svg
              className="w-6 h-6 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm md:text-base font-medium">
              {isImportant && <span className="font-bold mr-2">【重要】</span>}
              {banner.display_message}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="ml-4 flex-shrink-0 p-1 hover:bg-white/20 rounded transition-colors"
            aria-label="閉じる"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeadlineNotificationBanner;

