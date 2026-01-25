// src/components/PDFButton.tsx
// PDF生成ボタンコンポーネント（修正版）

import React, { useState } from 'react';
import apiClient from '../api/client';

interface PDFButtonProps {
  invoiceId: number;
  invoiceNumber: string;
}

const PDFButton: React.FC<PDFButtonProps> = ({ invoiceId, invoiceNumber }) => {
  const [loading, setLoading] = useState(false);

  const handleGeneratePDF = async () => {
    setLoading(true);
    try {
      // ✅ 修正: apiClient経由でAPI呼び出し（自動的にポート8001、トークン付与）
      const response = await apiClient.get(
        `/invoices/${invoiceId}/generate_pdf/`,
        {
          responseType: 'blob',
        }
      );

      // Blobからダウンロードリンクを作成
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice_${invoiceNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      // URLをクリーンアップ
      window.URL.revokeObjectURL(url);

      alert('PDFをダウンロードしました');
    } catch (error) {
      console.error('PDF生成エラー:', error);
      alert('PDF生成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleGeneratePDF}
      disabled={loading}
      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition disabled:bg-gray-400"
    >
      {loading ? 'PDF生成中...' : '📄 PDFダウンロード'}
    </button>
  );
};

export default PDFButton;