import React, { useState } from 'react';
import { Download, FileSpreadsheet, ChevronDown } from 'lucide-react';

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

  // ベースURLを取得（ポート8001のバックエンドサーバー）
  const getBaseUrl = () => {
    // 環境変数がある場合はそれを使用、なければ開発環境のデフォルト
    const envUrl = process.env.REACT_APP_API_URL;
    if (envUrl) {
      // /api を除去（後で追加するため）
      return envUrl.replace(/\/api\/?$/, '');
    }
    return 'http://localhost:8001';
  };

  // CSVエクスポートURL生成
  const getExportUrl = (type: 'invoices' | 'monthly' | 'company' | 'site') => {
    const baseUrl = getBaseUrl();
    const query = new URLSearchParams({ year: year.toString() });
    if (month) query.append('month', month.toString());
    
    switch (type) {
      case 'invoices':
        return `${baseUrl}/api/csv-export/invoices/?${query.toString()}`;
      case 'monthly':
        return `${baseUrl}/api/csv-export/monthly_summary/?${query.toString()}`;
      case 'company':
        return `${baseUrl}/api/csv-export/company_summary/?${query.toString()}`;
      case 'site':
        return `${baseUrl}/api/csv-export/site_summary/?${query.toString()}`;
      default:
        return `${baseUrl}/api/csv-export/invoices/?${query.toString()}`;
    }
  };

  const handleExport = async (type: 'invoices' | 'monthly' | 'company' | 'site') => {
    setExporting(true);
    
    const url = getExportUrl(type);
    const token = localStorage.getItem('access_token');
    
    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': '*/*',
        }
      });
      
      // レスポンスのContent-Typeをチェック
      const contentType = response.headers.get('Content-Type') || '';
      
      if (!response.ok) {
        // エラーレスポンスの場合
        if (contentType.includes('application/json')) {
          const errorData = await response.json();
          throw new Error(errorData.error || errorData.detail || 'ダウンロードに失敗しました');
        } else {
          throw new Error(`HTTPエラー: ${response.status}`);
        }
      }
      
      // CSVかどうかを確認
      if (!contentType.includes('text/csv') && !contentType.includes('application/octet-stream')) {
        console.warn('Unexpected content type:', contentType);
      }
      
      // Blobとして取得
      const blob = await response.blob();
      
      // ファイルサイズチェック
      if (blob.size === 0) {
        throw new Error('データがありません');
      }
      
      // ダウンロードURLを作成
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      
      // ファイル名を設定
      const filename = {
        invoices: `請求書一覧_${year}年${month ? month + '月' : ''}.csv`,
        monthly: `月別集計_${year}年${month ? month + '月' : ''}.csv`,
        company: `業者別集計_${year}年${month ? month + '月' : ''}.csv`,
        site: `現場別集計_${year}年${month ? month + '月' : ''}.csv`,
      }[type];
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
      
    } catch (error: any) {
      console.error('CSV export error:', error);
      alert(error.message || 'CSVのダウンロードに失敗しました');
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
