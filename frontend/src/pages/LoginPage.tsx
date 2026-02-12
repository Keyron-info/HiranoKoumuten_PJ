import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('メールアドレスとパスワードを入力してください');
      return;
    }

    try {
      setLoading(true);
      await login({ email, password });

      // ログインを保持する場合の処理
      if (rememberMe) {
        localStorage.setItem('rememberEmail', email);
      } else {
        localStorage.removeItem('rememberEmail');
      }

      navigate('/dashboard');
    } catch (err: any) {
      console.error('Login error:', err);

      if (err.response?.status === 401) {
        setError('メールアドレスまたはパスワードが正しくありません。もう一度お試しください。');
      } else if (err.response?.status === 400) {
        setError('入力内容を確認してください。');
      } else if (err.code === 'ERR_NETWORK') {
        setError('サーバーに接続できません。しばらく待ってからお試しください。');
      } else {
        setError('ログインに失敗しました。お手数ですが、システム管理者にお問い合わせください。');
      }
    } finally {
      setLoading(false);
    }
  };

  // 保存されたメールアドレスを復元
  React.useEffect(() => {
    const savedEmail = localStorage.getItem('rememberEmail');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* 背景装飾 */}
      <div className="absolute top-0 left-0 w-full h-full z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-primary-600/20 rounded-full blur-[100px] mix-blend-screen animate-pulse"></div>
        <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-primary-800/20 rounded-full blur-[100px] mix-blend-screen animate-pulse delay-700"></div>
      </div>

      <div className="max-w-md w-full relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl mb-4 shadow-xl shadow-primary-500/20 transform rotate-3">
            <span className="text-white text-2xl font-bold tracking-wider">平野</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">平野工務店-BIM</h1>
          <p className="text-slate-400">請求書管理システムへログイン</p>
        </div>

        <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
          <div className="p-8">
            {/* エラーメッセージ */}
            {error && (
              <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-lg flex items-start gap-3">
                <div className="text-rose-400 mt-0.5">
                  <AlertCircle size={18} />
                </div>
                <p className="text-rose-200 text-sm flex-1">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* メールアドレス */}
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium text-slate-300">
                  メールアドレス
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 group-focus-within:text-primary-400 transition-colors">
                    <Mail size={18} />
                  </div>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg focus:bg-slate-800 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none text-white placeholder-slate-600"
                    placeholder="example@hirano-koumuten.co.jp"
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* パスワード */}
              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-medium text-slate-300">
                  パスワード
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 group-focus-within:text-primary-400 transition-colors">
                    <Lock size={18} />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-12 py-3 bg-slate-800/50 border border-slate-700 rounded-lg focus:bg-slate-800 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none text-white placeholder-slate-600"
                    placeholder="パスワードを入力"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors p-1"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* オプション */}
              <div className="flex items-center justify-between">
                <label className="flex items-center cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 text-primary-500 border-slate-600 rounded focus:ring-primary-500 bg-slate-700"
                  />
                  <span className="ml-2 text-sm text-slate-400 group-hover:text-slate-300 transition-colors">ログインを保持</span>
                </label>
                <Link
                  to="/forgot-password"
                  className="text-sm text-primary-400 hover:text-primary-300 font-medium transition-colors hover:underline"
                >
                  パスワードをお忘れですか？
                </Link>
              </div>

              {/* ログインボタン */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-primary-600 to-primary-500 text-white py-3.5 rounded-lg font-bold hover:from-primary-500 hover:to-primary-400 transition-all shadow-lg hover:shadow-primary-500/25 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>ログイン中...</span>
                  </>
                ) : (
                  <span>ログイン</span>
                )}
              </button>
            </form>
          </div>

          {/* 新規登録リンク */}
          <div className="px-8 py-6 bg-slate-900/50 border-t border-slate-700/50">
            <p className="text-center text-sm text-slate-400">
              アカウントをお持ちでない方は<br className="sm:hidden" />
              <Link
                to="/register"
                className="ml-1 text-primary-400 hover:text-primary-300 font-bold transition-colors hover:underline"
              >
                新規登録はこちら
              </Link>
            </p>
          </div>
        </div>

        {/* フッター */}
        <p className="text-center text-xs text-slate-600 mt-8">
          © 2025 平野工務店. All rights reserved.
          <br />
          System by 平野工務店-BIM
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
