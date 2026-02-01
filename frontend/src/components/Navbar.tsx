// src/components/Navbar.tsx
// ナビゲーションバー

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const userType = user?.user_type;
  const userName = user?.last_name && user?.first_name
    ? `${user.last_name} ${user.first_name}`
    : (user?.username || 'ユーザー');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link to="/dashboard" className="flex-shrink-0 flex items-center gap-3 group">
              <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-primary-600 text-white rounded-xl flex items-center justify-center font-bold text-lg shadow-lg shadow-primary-900/20 group-hover:scale-105 transition-transform duration-200">
                K
              </div>
              <span className="text-xl font-bold text-white tracking-tight group-hover:text-primary-400 transition-colors">
                KEYRON BIM
              </span>
            </Link>

            <div className="hidden sm:ml-10 sm:flex sm:space-x-2">
              <NavLink to="/dashboard" label="ダッシュボード" />
              <NavLink to="/invoices" label="請求書一覧" />

              {/* 請求書作成は協力会社のみ */}
              {user?.user_type === 'customer' && (
                <NavLink to="/invoices/create" label="請求書作成" />
              )}

              {/* 承認待ち一覧は社内ユーザーのみ */}
              {user?.user_type === 'internal' && (
                <NavLink to="/my-approvals" label="承認待ち" />
              )}

              {/* 月次管理は管理者または経理のみ */}
              {(user?.user_type === 'admin' || (user?.user_type === 'internal' && (user?.position === 'accountant' || user?.position === 'admin'))) && (
                <NavLink to="/invoice-periods" label="月次管理" />
              )}

              {/* 現場管理は管理者または経理のみ */}
              {(user?.user_type === 'admin' || (user?.user_type === 'internal' && (user?.position === 'accountant' || user?.position === 'admin'))) && (
                <NavLink to="/admin/sites" label="現場管理" />
              )}

              {/* 登録申請管理は管理者または経理のみ */}
              {(user?.user_type === 'admin' || (user?.user_type === 'internal' && (user?.position === 'accountant' || user?.position === 'admin'))) && (
                <NavLink to="/admin/registration-requests" label="登録申請" />
              )}

              {/* カレンダー管理は管理者または経理のみ */}
              {(user?.user_type === 'admin' || (user?.user_type === 'internal' && (user?.position === 'accountant' || user?.position === 'admin'))) && (
                <NavLink to="/admin/calendar-management" label="カレンダー" />
              )}

              {/* ユーザー管理は管理者または経理のみ */}
              {(user?.user_type === 'admin' || (user?.user_type === 'internal' && (user?.position === 'accountant' || user?.position === 'admin'))) && (
                <NavLink to="/admin/users" label="ユーザー" />
              )}

              {/* 協力会社管理は管理者または経理のみ */}
              {(user?.user_type === 'admin' || (user?.user_type === 'internal' && (user?.position === 'accountant' || user?.position === 'admin'))) && (
                <NavLink to="/admin/partners" label="協力会社" />
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link to="/my-profile" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="text-right hidden md:block">
                <div className="text-sm font-medium text-slate-200">{userName}</div>
                <div className="text-xs text-primary-400 font-medium">{userType === 'internal' ? '社内管理者' : '協力会社'}</div>
              </div>
              <div className="h-9 w-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-medium shadow-sm">
                {userName.charAt(0)}
              </div>
            </Link>

            <button
              onClick={handleLogout}
              className="ml-2 text-xs text-slate-400 hover:text-white font-medium px-4 py-2 rounded-lg hover:bg-slate-800 transition-all border border-transparent hover:border-slate-700"
            >
              ログアウト
            </button>
          </div>
        </div>
      </div>
    </nav >
  );
};

const NavLink: React.FC<{ to: string; label: string }> = ({ to, label }) => {
  // 簡易的なアクティブ判定
  const isActive = window.location.pathname.startsWith(to) &&
    (to === '/dashboard' ? window.location.pathname === '/dashboard' : true);

  return (
    <Link
      to={to}
      className={`inline-flex items-center px-4 pt-1 border-b-2 text-sm font-medium transition-all h-full ${isActive
        ? 'border-primary-500 text-white'
        : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
        }`}
    >
      {label}
    </Link>
  );
};

export default Navbar;