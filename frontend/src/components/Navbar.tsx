// src/components/Navbar.tsx
// ナビゲーションバー

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const userType = localStorage.getItem('user_type');
  const userName = localStorage.getItem('user_name') || 'ユーザー';

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user_type');
    localStorage.removeItem('user_name');
    navigate('/login');
  };

  return (
    <nav className="bg-blue-600 text-white shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link to="/dashboard" className="flex items-center space-x-2">
            <div className="text-2xl font-bold">📋</div>
            <span className="text-xl font-bold">KEYRON BIM</span>
          </Link>

          <div className="flex items-center space-x-6">
            <Link to="/dashboard" className="hover:text-blue-200 transition">
              ダッシュボード
            </Link>
            <Link to="/invoices" className="hover:text-blue-200 transition">
              請求書一覧
            </Link>
            <Link to="/invoices/create" className="hover:text-blue-200 transition">
              請求書作成
            </Link>
            
            {userType === 'internal' && (
              <>
                <Link to="/invoice-periods" className="hover:text-blue-200 transition">
                  月次管理
                </Link>
                <Link to="/templates" className="hover:text-blue-200 transition">
                  テンプレート
                </Link>
              </>
            )}

            <div className="flex items-center space-x-4 border-l border-blue-500 pl-6">
              <span className="text-sm">{userName}</span>
              <button
                onClick={handleLogout}
                className="bg-blue-700 hover:bg-blue-800 px-4 py-2 rounded transition"
              >
                ログアウト
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;