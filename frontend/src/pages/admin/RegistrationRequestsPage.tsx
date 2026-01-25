// frontend/src/pages/admin/RegistrationRequestsPage.tsx

import React, { useState, useEffect } from 'react';
import { userRegistrationAPI, UserRegistrationRequest } from '../../api/userRegistration';
import Layout from '../../components/common/Layout';

const RegistrationRequestsPage: React.FC = () => {
  const [requests, setRequests] = useState<UserRegistrationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<UserRegistrationRequest | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  
  useEffect(() => {
    fetchRequests();
  }, []);
  
  const fetchRequests = async () => {
    try {
      const data = await userRegistrationAPI.getRequests();
      setRequests(data);
    } catch (error) {
      alert('登録申請の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };
  
  const handleApprove = async (requestId: number) => {
    if (!window.confirm('この登録申請を承認しますか？ユーザーアカウントが作成されます。')) {
      return;
    }
    
    try {
      await userRegistrationAPI.approve(requestId);
      alert('登録申請を承認しました');
      fetchRequests();
    } catch (error: any) {
      alert(error.response?.data?.error || '承認処理に失敗しました');
    }
  };
  
  const handleReject = async () => {
    if (!selectedRequest) return;
    
    if (!rejectionReason.trim()) {
      alert('却下理由を入力してください');
      return;
    }
    
    try {
      await userRegistrationAPI.reject(selectedRequest.id, rejectionReason);
      alert('登録申請を却下しました');
      setShowRejectModal(false);
      setRejectionReason('');
      setSelectedRequest(null);
      fetchRequests();
    } catch (error: any) {
      alert(error.response?.data?.error || '却下処理に失敗しました');
    }
  };
  
  const openRejectModal = (request: UserRegistrationRequest) => {
    setSelectedRequest(request);
    setShowRejectModal(true);
  };
  
  const getStatusBadge = (status: string) => {
    const styles = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
    };
    const labels = {
      PENDING: '承認待ち',
      APPROVED: '承認済み',
      REJECTED: '却下',
    };
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };
  
  if (loading) {
    return (
      <Layout>
        <div className="p-8 text-center">読み込み中...</div>
      </Layout>
    );
  }
  
  return (
    <Layout>
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-6">ユーザー登録申請管理</h1>
        
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">会社名</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">氏名</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">メールアドレス</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">申請日</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ステータス</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">アクション</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {requests.map(request => (
                <tr key={request.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {request.company_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {request.full_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {request.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {new Date(request.submitted_at).toLocaleDateString('ja-JP')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(request.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                    {request.status === 'PENDING' && (
                      <>
                        <button
                          onClick={() => handleApprove(request.id)}
                          className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                        >
                          承認
                        </button>
                        <button
                          onClick={() => openRejectModal(request)}
                          className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                        >
                          却下
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => setSelectedRequest(request)}
                      className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      詳細
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* 却下モーダル */}
        {showRejectModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h2 className="text-xl font-bold mb-4">登録申請を却下</h2>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  却下理由
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="申請者に通知される却下理由を入力してください"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleReject}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  却下する
                </button>
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectionReason('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default RegistrationRequestsPage;

