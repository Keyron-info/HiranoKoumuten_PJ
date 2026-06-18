// src/components/common/InvoiceExportMenu.tsx
// 請求書一覧のエクスポート（CSV / Excel / PDF）。経理のみ表示。
// apiClient経由でダウンロードするため、トークン期限切れ時も自動更新され403にならない。

import React, { useState, useRef, useEffect } from 'react';
import { Download, FileSpreadsheet, FileText, FileDown, ChevronDown } from 'lucide-react';
import apiClient from '../../api/client';

type ExportFormat = 'csv' | 'excel' | 'pdf';

interface InvoiceExportMenuProps {
  // 一覧と同じ絞り込み条件を引き継ぐ
  params?: {
    status?: string;
    year?: number;
    month?: number;
    site?: number;
    company?: number;
  };
}

const FORMAT_CONFIG: Record<ExportFormat, { path: string; ext: string; label: string; icon: React.ElementType }> = {
  csv: { path: '/csv-export/invoices/', ext: 'csv', label: 'CSV', icon: FileText },
  excel: { path: '/csv-export/invoices_excel/', ext: 'xlsx', label: 'Excel', icon: FileSpreadsheet },
  pdf: { path: '/csv-export/invoices_pdf/', ext: 'pdf', label: 'PDF', icon: FileDown },
};

const InvoiceExportMenu: React.FC<InvoiceExportMenuProps> = ({ params }) => {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<ExportFormat | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleExport = async (format: ExportFormat) => {
    const cfg = FORMAT_CONFIG[format];
    setBusy(format);
    try {
      // apiClientはトークン自動付与＋401時に自動リフレッシュする
      const response = await apiClient.get(cfg.path, {
        params,
        responseType: 'blob',
      });

      // エラーがblobで返ってきた場合（JSON）を検出
      const blob = response.data as Blob;
      if (blob.type && blob.type.includes('application/json')) {
        const text = await blob.text();
        let msg = 'ダウンロードに失敗しました';
        try { msg = JSON.parse(text).error || msg; } catch { /* noop */ }
        throw new Error(msg);
      }
      if (blob.size === 0) throw new Error('対象データがありません');

      const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `請求書一覧_${today}.${cfg.ext}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 403) {
        alert('エクスポートは経理担当のみ利用できます。');
      } else {
        alert(err?.message || 'エクスポートに失敗しました');
      }
    } finally {
      setBusy(null);
      setOpen(false);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={busy !== null}
        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-60"
      >
        <Download size={18} />
        {busy ? `${FORMAT_CONFIG[busy].label}を作成中...` : 'エクスポート'}
        <ChevronDown size={16} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-xl py-1 z-50">
          {(Object.keys(FORMAT_CONFIG) as ExportFormat[]).map((fmt) => {
            const cfg = FORMAT_CONFIG[fmt];
            const Icon = cfg.icon;
            return (
              <button
                key={fmt}
                onClick={() => handleExport(fmt)}
                disabled={busy !== null}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                <Icon size={16} className="text-gray-500" />
                <span>{cfg.label}で出力</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default InvoiceExportMenu;
