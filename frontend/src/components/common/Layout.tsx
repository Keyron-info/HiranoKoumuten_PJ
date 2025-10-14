import React, { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* シンプルなヘッダー（後でFigmaデザインに差し替え） */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link to="/dashboard" className="text-xl font-bold text-primary-600">
                KEYRON BIM
              </Link>
              <nav className="ml-10 flex space-x-4">
                <Link to="/dashboard" className="text-gray-700 hover:text-primary-600 px-3 py-2">
                  ダッシュボード
                </Link>
                <Link to="/invoices" className="text-gray-700 hover:text-primary-600 px-3 py-2">
                  請求書一覧
                </Link>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                {user?.last_name} {user?.first_name}
              </span>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-700 hover:text-primary-600"
              >
                ログアウト
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main>{children}</main>
    </div>
  );
};

export default Layout;