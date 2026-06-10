// src/components/Navbar.tsx
// ナビゲーションバー

import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [adminOpen, setAdminOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const userType = user?.user_type;
  const userName = user?.last_name && user?.first_name
    ? `${user.last_name} ${user.first_name}`
    : (user?.username || 'ユーザー');

  const isAdmin =
    user?.user_type === 'admin' ||
    (user?.user_type === 'internal' &&
      (user?.position === 'accountant' || user?.position === 'admin'));

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // ドロップダウン外クリックで閉じる
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setAdminOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // 管理メニュー配下のパスかチェック（ドロップダウンのアクティブ表示用）
  const adminPaths = [
    '/invoice-periods', '/admin/sites', '/admin/registration-requests',
    '/admin/calendar-management', '/admin/users', '/admin/partners',
    '/admin/construction-types', '/audit-logs', '/payment-report',
  ];
  const isAdminActive = adminPaths.some(p => window.location.pathname.startsWith(p));

  return (
    <nav className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">

          {/* 左側: ロゴ + メニュー */}
          <div className="flex items-center">
            <Link to="/dashboard" className="flex-shrink-0 flex items-center gap-3 group mr-8">
              <img
                src="https://storage.googleapis.com/studio-design-asset-files/projects/1YWj39BMOm/s-863x333_v-fs_webp_f2cc1848-85e6-4e11-a855-9a6eff182a67.png"
                alt="平野工務店-BIM"
                className="h-10 w-auto group-hover:scale-105 transition-transform duration-200"
              />
              <span className="text-xl font-bold text-white tracking-tight group-hover:text-primary-400 transition-colors hidden lg:block">
                平野工務店-BIM
              </span>
            </Link>

            <div className="flex items-center gap-1">
              <NavLink to="/dashboard" label="ダッシュボード" />
              <NavLink to="/invoices" label="請求書一覧" />

              {/* 協力会社のみ */}
              {user?.user_type === 'customer' && (
                <NavLink to="/invoices/create" label="請求書作成" />
              )}

              {/* 社内ユーザーのみ（承認待ち） */}
              {user?.user_type === 'internal' && (
                <NavLink to="/my-approvals" label="承認待ち" />
              )}

              {/* 経理・管理者のみ: 管理ドロップダウンにまとめる */}
              {isAdmin && (
                <div className="relative h-full flex items-center" ref={dropdownRef}>
                  <button
                    onClick={() => setAdminOpen(v => !v)}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-all border ${
                      isAdminActive || adminOpen
                        ? 'bg-slate-700 text-white border-slate-600'
                        : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-800'
                    }`}
                  >
                    管理
                    <ChevronDown
                      size={14}
                      className={`transition-transform duration-200 ${adminOpen ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {adminOpen && (
                    <div className="absolute top-full left-0 mt-1 w-44 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1 z-50">
                      <DropItem to="/invoice-periods"              label="月次管理" onClick={() => setAdminOpen(false)} />
                      <DropItem to="/payment-report"               label="支払い表" onClick={() => setAdminOpen(false)} />
                      <div className="border-t border-slate-700 my-1" />
                      <DropItem to="/admin/sites"                  label="現場管理" onClick={() => setAdminOpen(false)} />
                      <DropItem to="/admin/partners"               label="協力会社管理" onClick={() => setAdminOpen(false)} />
                      <DropItem to="/admin/construction-types"     label="工種管理" onClick={() => setAdminOpen(false)} />
                      <div className="border-t border-slate-700 my-1" />
                      <DropItem to="/admin/users"                  label="ユーザー管理" onClick={() => setAdminOpen(false)} />
                      <DropItem to="/admin/registration-requests"  label="登録申請" onClick={() => setAdminOpen(false)} />
                      <div className="border-t border-slate-700 my-1" />
                      <DropItem to="/admin/calendar-management"    label="カレンダー管理" onClick={() => setAdminOpen(false)} />
                      <DropItem to="/audit-logs"                   label="操作ログ" onClick={() => setAdminOpen(false)} />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 右側: ユーザー情報 + ログアウト */}
          <div className="flex items-center gap-3">
            <Link to="/my-profile" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="text-right hidden md:block">
                <div className="text-sm font-medium text-slate-200">{userName}</div>
                <div className="text-xs text-primary-400 font-medium">
                  {userType === 'internal' ? '社内' : '協力会社'}
                </div>
              </div>
              <div className="h-9 w-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-medium shadow-sm">
                {userName.charAt(0)}
              </div>
            </Link>

            <button
              onClick={handleLogout}
              className="text-xs text-slate-400 hover:text-white font-medium px-3 py-2 rounded-lg hover:bg-slate-800 transition-all border border-transparent hover:border-slate-700"
            >
              ログアウト
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

// 通常のナビリンク
const NavLink: React.FC<{ to: string; label: string }> = ({ to, label }) => {
  const isActive = window.location.pathname.startsWith(to) &&
    (to === '/dashboard' ? window.location.pathname === '/dashboard' : true);

  return (
    <Link
      to={to}
      className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-all border ${
        isActive
          ? 'bg-slate-700 text-white border-slate-600'
          : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-800'
      }`}
    >
      {label}
    </Link>
  );
};

// ドロップダウンの各アイテム
const DropItem: React.FC<{ to: string; label: string; onClick: () => void }> = ({ to, label, onClick }) => {
  const isActive = window.location.pathname.startsWith(to);
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`block px-4 py-2 text-sm transition-colors ${
        isActive
          ? 'bg-slate-700 text-white'
          : 'text-slate-300 hover:bg-slate-700 hover:text-white'
      }`}
    >
      {label}
    </Link>
  );
};

export default Navbar;
