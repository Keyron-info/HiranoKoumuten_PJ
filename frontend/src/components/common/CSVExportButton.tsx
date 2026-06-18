import React, { useState } from 'react';
import { Download, FileSpreadsheet, ChevronDown } from 'lucide-react';
import apiClient from '../../api/client';

interface CSVExportButtonProps {
  year?: number;
  month?: number;
  showDropdown?: boolean;
}

const CSVExportButton: React.FC<CSVExportButtonProps> = ({
  year = new Date().getFullYear(),
  month,
  showDropdown = true
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  // CSVエクスポートの相対パス（apiClientのbaseURL配下）
  const getExportPath = (type: 'invoices' | 'monthly' | 'company' | 'site') => {
    switch (type) {
      case 'monthly': return '/csv-export/monthly_summary/';
      case 'company': return '/csv-export/company_summary/';
      case 'site': return '/csv-export/site_summary/';
      case 'invoices':
      default: return '/csv-export/invoices/';
    }
  };

  const handleExport = async (type: 'invoices' | 'monthly' | 'company' | 'site') => {
    setExporting(true);

    try {
      // apiClient経由（トークン自動付与＋401時の自動リフレッシュ）でダウンロード
      const params: Record<string, string | number> = { year };
      if (month) params.month = month;
      const response = await apiClient.get(getExportPath(type), {
        params,
        responseType: 'blob',
      });

      const blob = response.data as Blob;
      // エラーがJSON(blob)で返ってきた場合
      if (blob.type && blob.type.includes('application/json')) {
        const text = await blob.text();
        let msg = 'ダウンロードに失敗しました';
        try { msg = JSON.parse(text).error || msg; } catch { /* noop */ }
        throw new Error(msg);
      }
      if (blob.size === 0) {
        throw new Error('データがありません');
      }

      const filename = {
        invoices: `請求書一覧_${year}年${month ? month + '月' : ''}.csv`,
        monthly: `月別集計_${year}年${month ? month + '月' : ''}.csv`,
        company: `業者別集計_${year}年${month ? month + '月' : ''}.csv`,
        site: `現場別集計_${year}年${month ? month + '月' : ''}.csv`,
      }[type];

      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

    } catch (error: any) {
      console.error('CSV export error:', error);
      if (error?.response?.status === 403) {
        alert('エクスポートは経理担当のみ利用できます。');
      } else {
        alert(error?.message || 'CSVのダウンロードに失敗しました');
      }
    } finally {
      setExporting(false);
      setIsOpen(false);
    }
  };

  if (!showDropdown) {
    return (
      <button
        onClick={() => handleExport('invoices')}
        disabled={exporting}
        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
      >
        <Download size={18} />
        {exporting ? 'ダウンロード中...' : 'CSV出力'}
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
      >
        <FileSpreadsheet size={18} />
        CSV出力
        <ChevronDown size={16} className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
            <div className="py-2">
              <button
                onClick={() => handleExport('invoices')}
                disabled={exporting}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
              >
                <Download size={16} />
                請求書一覧
              </button>
              <button
                onClick={() => handleExport('monthly')}
                disabled={exporting}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
              >
                <Download size={16} />
                月別集計
              </button>
              <button
                onClick={() => handleExport('company')}
                disabled={exporting}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
              >
                <Download size={16} />
                業者別集計
              </button>
              <button
                onClick={() => handleExport('site')}
                disabled={exporting}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
              >
                <Download size={16} />
                現場別集計
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CSVExportButton;
