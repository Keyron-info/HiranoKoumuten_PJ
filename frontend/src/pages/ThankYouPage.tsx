import React from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/common/Layout';

const ThankYouPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <Layout>
            <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 animate-fade-in text-center">
                <div className="bg-white p-8 md:p-12 rounded-lg shadow-lg max-w-2xl w-full border border-primary-100">
                    <div className="mb-6">
                        <span className="text-6xl">🙌</span>
                    </div>

                    <h1 className="text-3xl font-bold text-gray-900 mb-4">
                        お疲れ様です！
                    </h1>

                    <p className="text-xl text-gray-700 mb-8 leading-relaxed">
                        いつもありがとうございます。<br />
                        書類の提出を受け付けました。
                    </p>

                    <div className="space-y-4">
                        <button
                            onClick={() => navigate('/invoices')}
                            className="w-full md:w-auto px-8 py-3 bg-primary-500 text-white rounded-full font-medium hover:bg-primary-600 transition-transform transform hover:scale-105 shadow-md flex items-center justify-center gap-2 mx-auto"
                        >
                            請求書一覧へ戻る
                        </button>
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="block w-full md:w-auto px-8 py-3 text-gray-600 hover:text-primary-600 transition-colors mx-auto"
                        >
                            ダッシュボードへ
                        </button>
                    </div>
                </div>

                <div className="mt-8 text-sm text-gray-500">
                    <p>※ 承認状況は一覧画面または通知からご確認いただけます。</p>
                </div>
            </div>
        </Layout>
    );
};

export default ThankYouPage;
