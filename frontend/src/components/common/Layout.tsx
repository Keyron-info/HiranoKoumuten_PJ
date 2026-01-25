import React, { ReactNode } from 'react';
import DeadlineNotificationBanner from '../DeadlineNotificationBanner';
import Navbar from '../Navbar';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 締め日変更バナー（全ページ共通） */}
      <DeadlineNotificationBanner />

      {/* シンプルなヘッダー（後でFigmaデザインに差し替え） */}
      <Navbar />

      {/* メインコンテンツ */}
      <main>{children}</main>
    </div>
  );
};

export default Layout;