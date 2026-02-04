import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  CheckCircle, XCircle, Download, MessageSquare, Clock, User,
  Building2, Calendar, Edit3, ArrowLeft
} from 'lucide-react';
import { invoiceAPI } from '../api/invoices';
import Layout from '../components/common/Layout';
import { useAuth } from '../contexts/AuthContext';

interface InvoiceItem {
  id: number;
  item_number: number;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  amount: number;
}

interface ApprovalHistoryItem {
  id: number;
  action: string;
  action_display?: string;
  user_name?: string;
  comment: string;
  timestamp: string;
}

interface Correction {
  id: number;
  field_name: string;
  field_type_display: string;
  original_value: string;
  corrected_value: string;
  correction_reason: string;
  corrected_by_name: string;
  created_at: string;
  is_approved_by_partner: boolean;
}

// Add current_approver to interface
interface InvoiceDetail {
  id: number;
  invoice_number: string;
  customer_company_name: string;
  receiving_company_name?: string;
  construction_site_name_display?: string;
  project_name?: string;
  construction_type_name?: string;
  invoice_date: string;
  billing_period_start?: string;
  billing_period_end?: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  status: string;
  status_display: string;
  created_at: string;
  submitted_at?: string;
  is_returned?: boolean;
  has_corrections?: boolean;
  can_partner_edit?: boolean;
  return_reason?: string;
  return_note?: string;
  partner_acknowledged_at?: string;
  partner_acknowledged_by?: number;
  items: InvoiceItem[];
  approval_histories?: ApprovalHistoryItem[];
  corrections?: Correction[];
  current_approver?: number; // 承認者のIDを追加
}

// ... (in component) ...

            ) : isInternalUser && invoice.status === 'pending_approval' && (user?.id === invoice.current_approver || user?.position === 'accountant' || user?.user_type === 'admin') ? (
  // 平野工務店ユーザー & 承認待ち & (現在の承認者 OR 経理 OR 管理者): 承認・差し戻し・却下ボタン
  <div className="bg-white rounded-xl shadow-sm p-6">
    <h2 className="text-xl font-bold text-gray-900 mb-6">承認アクション</h2>
    <div className="space-y-3">
      <button
        onClick={handleApprove}
        disabled={processing}
        className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-4 rounded-lg font-bold text-lg hover:from-green-600 hover:to-green-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center space-x-2 disabled:opacity-50"
      >
        <CheckCircle size={24} />
        <span>{processing ? '処理中...' : '承認する'}</span>
      </button>
      {/* 差し戻し（赤ペン修正）ボタン */}
      <button
        onClick={() => navigate(`/invoices/${id}/edit-correction`)}
        className="w-full bg-gradient-to-r from-primary-500 to-primary-600 text-white py-4 rounded-lg font-bold text-lg hover:from-primary-600 hover:to-primary-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center space-x-2"
      >
        <Edit3 size={24} />
        <span>差し戻し（修正依頼）</span>
      </button>
      {/* 却下ボタン */}
      <button
        onClick={() => setShowRejectModal(true)}
        disabled={processing}
        className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white py-4 rounded-lg font-bold text-lg hover:from-red-600 hover:to-red-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center space-x-2 disabled:opacity-50"
      >
        <XCircle size={24} />
        <span>却下</span>
      </button>
    </div>
  </div>
) : null}

{/* 承認履歴 */ }
<div className="bg-white rounded-xl shadow-sm p-6">
  <h2 className="text-lg font-bold text-gray-900 mb-4">承認履歴</h2>
  <div className="space-y-4">
    {invoice.approval_histories && invoice.approval_histories.length > 0 ? (
      invoice.approval_histories.map((history, index) => (
        <div key={index} className="relative">
          {index !== invoice.approval_histories!.length - 1 && (
            <div className="absolute left-4 top-10 bottom-0 w-0.5 bg-gray-200" />
          )}
          <div className="flex items-start space-x-3">
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${history.action === 'approved' || history.action === 'submitted'
              ? 'bg-green-100 text-green-600'
              : history.action === 'returned' || history.action === 'rejected'
                ? 'bg-red-100 text-red-600'
                : 'bg-primary-100 text-primary-600'
              }`}>
              {getStatusIcon(history.action)}
            </div>
            <div className="flex-1 pb-4">
              <p className="font-medium text-gray-900 text-sm">{history.action_display || history.action}</p>
              <p className="text-xs text-gray-600">{history.user_name || '不明'}</p>
              <p className="text-xs text-gray-500 mt-1">{formatDateTime(history.timestamp)}</p>
              {history.comment && (
                <p className="text-xs text-gray-700 mt-2 bg-gray-50 p-2 rounded">{history.comment}</p>
              )}
            </div>
          </div>
        </div>
      ))
    ) : (
      // デフォルト承認フロー表示
      approvalSteps.map((step, index) => (
        <div key={index} className="relative">
          {index !== approvalSteps.length - 1 && (
            <div className="absolute left-4 top-10 bottom-0 w-0.5 bg-gray-200" />
          )}
          <div className="flex items-start space-x-3">
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${step.status === 'completed'
              ? 'bg-green-100 text-green-600'
              : step.status === 'pending'
                ? 'bg-primary-100 text-primary-600'
                : 'bg-gray-100 text-gray-400'
              }`}>
              {step.status === 'completed' ? (
                <CheckCircle size={18} />
              ) : step.status === 'pending' ? (
                <Clock size={18} />
              ) : (
                <User size={18} />
              )}
            </div>
            <div className="flex-1 pb-4">
              <p className="font-medium text-gray-900 text-sm">{step.step}</p>
              <p className="text-xs text-gray-600">
                {step.status === 'completed' ? '完了' : step.status === 'pending' ? '待機中' : '未着手'}
              </p>
            </div>
          </div>
        </div>
      ))
    )}
  </div>
</div>
          </div >
        </div >
      </div >

  {/* 却下モーダル */ }
{
  showRejectModal && (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">却下理由を入力</h3>
        <textarea
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
          rows={4}
          placeholder="却下の理由を入力してください（必須）"
        />
        <div className="flex space-x-3 mt-6">
          <button
            onClick={() => setShowRejectModal(false)}
            disabled={processing}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={handleReject}
            disabled={processing}
            className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            {processing ? '処理中...' : '却下する'}
          </button>
        </div>
      </div>
    </div>
  )
}
    </Layout >
  );
};

export default InvoiceDetailPage;
