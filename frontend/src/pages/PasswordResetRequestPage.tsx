import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';
import { authAPI } from '../api/auth';

const PasswordResetRequestPage: React.FC = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await authAPI.requestPasswordReset(email);
            setSuccess(true);
        } catch (err: any) {
            console.error('Password reset request error:', err);
            // セキュリティのため、メールが存在しなくても成功したようなメッセージを出すのが理想だが、
            // ここではUX優先でエラーがあれば表示する（ただし詳細すぎないように）
            setError('メール送信に失敗しました。メールアドレスを確認してください。');
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
                    <h2 className="text-2xl font-bold text-slate-900">メールを送信しました</h2>
                    <p className="text-slate-600">
                        {email} 宛にパスワード再設定用のリンクを送信しました。メールを確認して、手続きを進めてください。
                    </p>
                    <div className="mt-8">
                        <Link
                            to="/login"
                            className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 w-full"
                        >
                            ログイン画面に戻る
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
                        パスワードの再設定
                    </h2>
                    <p className="mt-2 text-center text-sm text-slate-600">
                        登録したメールアドレスを入力してください。<br />
                        再設定用のリンクをお送りします。
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
                                    <h3 className="text-sm font-medium text-rose-800">{error}</h3>
                                </div>
                            </div>
                        </div>
                    )}

                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                            メールアドレス
                        </label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Mail className="h-5 w-5 text-slate-400" aria-hidden="true" />
                            </div>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                className="focus:ring-primary-500 focus:border-primary-500 block w-full pl-10 sm:text-sm border-slate-300 rounded-md py-3"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
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
                                    送信中...
                                </>
                            ) : (
                                '再設定リンクを送信'
                            )}
                        </button>

                        <Link
                            to="/login"
                            className="flex items-center justify-center text-sm font-medium text-slate-600 hover:text-slate-900"
                        >
                            <ArrowLeft className="h-4 w-4 mr-1" />
                            ログイン画面に戻る
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PasswordResetRequestPage;
