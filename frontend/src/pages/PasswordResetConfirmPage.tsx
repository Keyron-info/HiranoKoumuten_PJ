import React, { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Lock, ArrowLeft, Loader2, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { authAPI } from '../api/auth';

const PasswordResetConfirmPage: React.FC = () => {
    const navigate = useNavigate();
    const { uid, token } = useParams<{ uid: string; token: string }>();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password.length < 8) {
            setError('パスワードは8文字以上である必要があります');
            return;
        }

        if (password !== confirmPassword) {
            setError('パスワードが一致しません');
            return;
        }

        if (!uid || !token) {
            setError('リンクが無効です。');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await authAPI.confirmPasswordReset(uid, token, password);
            setSuccess(true);
        } catch (err: any) {
            console.error('Password reset confirm error:', err);
            // Django側からのエラーメッセージがあればそれを表示、なければ一般的なエラー
            const errorMsg = err.response?.data?.error?.new_password1?.[0] ||
                err.response?.data?.error ||
                'パスワードの再設定に失敗しました。リンクの有効期限が切れている可能性があります。';
            setError(typeof errorMsg === 'string' ? errorMsg : 'エラーが発生しました');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-slate-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg border border-slate-200 text-center">
                    <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-emerald-100 mb-6">
                        <CheckCircle className="h-8 w-8 text-emerald-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900">パスワード再設定完了</h2>
                    <p className="text-slate-600">
                        パスワードが正常に変更されました。<br />
                        新しいパスワードでログインしてください。
                    </p>
                    <div className="mt-8">
                        <Link
                            to="/login"
                            className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 w-full"
                        >
                            ログインページへ
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg border border-slate-200">
                <div>
                    <div className="flex justify-center">
                        <div className="h-12 w-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg">
                            <span className="text-white font-bold text-xl">K</span>
                        </div>
                    </div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900">
                        新しいパスワードの設定
                    </h2>
                    <p className="mt-2 text-center text-sm text-slate-600">
                        8文字以上の新しいパスワードを入力してください。
                    </p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    {error && (
                        <div className="rounded-md bg-rose-50 p-4 border border-rose-200">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <svg className="h-5 w-5 text-rose-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="ml-3">
                                    <h3 className="text-sm font-medium text-rose-800">{String(error)}</h3>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                                新しいパスワード
                            </label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-slate-400" aria-hidden="true" />
                                </div>
                                <input
                                    id="password"
                                    name="password"
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    className="focus:ring-primary-500 focus:border-primary-500 block w-full pl-10 pr-10 sm:text-sm border-slate-300 rounded-md py-3"
                                    placeholder="8文字以上"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <button
                                    type="button"
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-5 w-5 text-slate-400" />
                                    ) : (
                                        <Eye className="h-5 w-5 text-slate-400" />
                                    )}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700">
                                パスワード（確認）
                            </label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-slate-400" aria-hidden="true" />
                                </div>
                                <input
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    className="focus:ring-primary-500 focus:border-primary-500 block w-full pl-10 sm:text-sm border-slate-300 rounded-md py-3"
                                    placeholder="確認のため再入力"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-all duration-200"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                                    更新中...
                                </>
                            ) : (
                                'パスワードを変更する'
                            )}
                        </button>

                        <Link
                            to="/login"
                            className="flex items-center justify-center text-sm font-medium text-slate-600 hover:text-slate-900"
                        >
                            <ArrowLeft className="h-4 w-4 mr-1" />
                            キャンセル
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PasswordResetConfirmPage;
