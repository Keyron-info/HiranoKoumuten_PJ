// frontend/src/pages/RegisterCompletePage.tsx

import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';

const RegisterCompletePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white shadow-md rounded-lg p-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            登録申請を受け付けました
          </h1>

          <div className="text-gray-700 space-y-4 mb-8">
            <p>
              ご登録ありがとうございます。登録申請を受け付けました。
            </p>
            <p>
              申請内容を確認後、承認完了時にメールでお知らせいたします。
            </p>
            <p className="text-sm text-gray-600">
              承認まで数日かかる場合がございます。ご了承ください。
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/login"
              className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              ログイン画面へ戻る
            </Link>
            <Link
              to="/"
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              トップページへ
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterCompletePage;

