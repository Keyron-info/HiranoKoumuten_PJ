// frontend/src/pages/PaymentReportPage.tsx
// 月次支払い表ページ（社内ユーザー専用）

import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../components/common/Layout';
import apiClient from '../api/client';

interface CompanyEntry {
    company_id: number;
    company_name: string;
    invoice_amount: number;
    safety_fee: number;
    net_amount: number;
    invoice_count: number;
}

interface SiteEntry {
    site_id: number;
    site_name: string;
    companies: CompanyEntry[];
    site_total_invoice: number;
    site_total_safety: number;
    site_total_net: number;
}

interface PaymentReport {
    year: number;
    month: number;
    payment_date: string;
    sites: SiteEntry[];
    grand_total_invoice: number;
    grand_total_safety: number;
    grand_total_net: number;
}

interface AvailableMonth {
    year: number;
    month: number;
}

const PaymentReportPage: React.FC = () => {
    const [year, setYear] = useState(new Date().getFullYear());
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [report, setReport] = useState<PaymentReport | null>(null);
    const [availableMonths, setAvailableMonths] = useState<AvailableMonth[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchAvailableMonths();
    }, []);

    const fetchAvailableMonths = async () => {
        try {
            const res = await apiClient.get('/payment-report/available_months/');
            setAvailableMonths(res.data);
        } catch {
            // 利用可能月が取得できなくても問題ない
        }
    };

    const fetchReport = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await apiClient.get('/payment-report/generate/', {
                params: { year, month },
            });
            setReport(res.data);
        } catch (err: any) {
            setError(err.response?.data?.error || '支払い表の取得に失敗しました');
            setReport(null);
        } finally {
            setLoading(false);
        }
    }, [year, month]);

    const formatCurrency = (amount: number) =>
        `¥${amount.toLocaleString('ja-JP')}`;

    const handlePrint = () => {
        window.print();
    };

    return (
        <Layout>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* ヘッダー */}
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">月次支払い表</h1>
                    {report && (
                        <button
                            onClick={handlePrint}
                            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition print:hidden"
                        >
                            🖨️ 印刷
                        </button>
                    )}
                </div>

                {/* 期間選択 */}
                <div className="bg-white shadow rounded-lg p-6 mb-6 print:hidden">
                    <div className="flex items-end gap-4 flex-wrap">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">年</label>
                            <input
                                type="number"
                                value={year}
                                onChange={(e) => setYear(parseInt(e.target.value))}
                                className="border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm w-24"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">月</label>
                            <select
                                value={month}
                                onChange={(e) => setMonth(parseInt(e.target.value))}
                                className="border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm w-20"
                            >
                                {[...Array(12)].map((_, i) => (
                                    <option key={i + 1} value={i + 1}>
                                        {i + 1}月
                                    </option>
                                ))}
                            </select>
                        </div>
                        <button
                            onClick={fetchReport}
                            disabled={loading}
                            className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition disabled:opacity-50"
                        >
                            {loading ? '読込中...' : '表示'}
                        </button>

                        {availableMonths.length > 0 && (
                            <div className="ml-4">
                                <label className="block text-sm font-medium text-gray-400 mb-1">クイック選択</label>
                                <div className="flex gap-2 flex-wrap">
                                    {availableMonths.slice(0, 6).map((m) => (
                                        <button
                                            key={`${m.year}-${m.month}`}
                                            onClick={() => {
                                                setYear(m.year);
                                                setMonth(m.month);
                                            }}
                                            className={`text-xs px-3 py-1 rounded-full border ${year === m.year && month === m.month
                                                    ? 'bg-primary-100 border-primary-400 text-primary-700'
                                                    : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                                                }`}
                                        >
                                            {m.year}/{m.month}月
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* エラー */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                        <p className="text-red-700">{error}</p>
                    </div>
                )}

                {/* レポート */}
                {report && (
                    <div>
                        {/* タイトル（印刷用） */}
                        <div className="hidden print:block text-center mb-6">
                            <h2 className="text-xl font-bold">
                                {report.year}年{report.month}月分 支払い表
                            </h2>
                            <p className="text-sm text-gray-500 mt-1">
                                支払日: {new Date(report.payment_date).toLocaleDateString('ja-JP')}
                            </p>
                        </div>

                        {/* 支払日情報 */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 print:bg-white print:border-gray-300">
                            <p className="text-blue-800 font-medium">
                                📅 {report.year}年{report.month}月分 ｜ 支払日:{' '}
                                <strong>{new Date(report.payment_date).toLocaleDateString('ja-JP')}</strong>
                            </p>
                        </div>

                        {/* データなし */}
                        {report.sites.length === 0 && (
                            <div className="bg-gray-50 rounded-lg p-12 text-center">
                                <p className="text-gray-500 text-lg">
                                    {report.year}年{report.month}月の承認済み請求書がありません
                                </p>
                            </div>
                        )}

                        {/* 現場ごとのテーブル */}
                        {report.sites.map((site) => (
                            <div key={site.site_id} className="bg-white shadow rounded-lg mb-6 overflow-hidden">
                                <div className="bg-gray-800 text-white px-6 py-3">
                                    <h3 className="font-bold text-lg">🏗 {site.site_name}</h3>
                                </div>
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                業者名
                                            </th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                                件数
                                            </th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                                請求金額
                                            </th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                                安全協力会費
                                            </th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                                差引支払額
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {site.companies.map((comp) => (
                                            <tr key={comp.company_id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                    {comp.company_name}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                                                    {comp.invoice_count}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                                                    {formatCurrency(comp.invoice_amount)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 text-right">
                                                    {comp.safety_fee > 0
                                                        ? `-${formatCurrency(comp.safety_fee)}`
                                                        : '-'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-primary-700 text-right">
                                                    {formatCurrency(comp.net_amount)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-gray-100">
                                        <tr>
                                            <td className="px-6 py-3 text-sm font-bold text-gray-900">
                                                現場小計
                                            </td>
                                            <td className="px-6 py-3 text-sm text-right text-gray-500">
                                                {site.companies.reduce((s, c) => s + c.invoice_count, 0)}
                                            </td>
                                            <td className="px-6 py-3 text-sm font-bold text-gray-900 text-right">
                                                {formatCurrency(site.site_total_invoice)}
                                            </td>
                                            <td className="px-6 py-3 text-sm font-bold text-red-600 text-right">
                                                {site.site_total_safety > 0
                                                    ? `-${formatCurrency(site.site_total_safety)}`
                                                    : '-'}
                                            </td>
                                            <td className="px-6 py-3 text-sm font-bold text-primary-700 text-right">
                                                {formatCurrency(site.site_total_net)}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        ))}

                        {/* 総合計 */}
                        {report.sites.length > 0 && (
                            <div className="bg-gray-900 text-white shadow rounded-lg p-6">
                                <h3 className="text-lg font-bold mb-4">📊 総合計</h3>
                                <div className="grid grid-cols-3 gap-6">
                                    <div>
                                        <p className="text-gray-400 text-sm">請求金額合計</p>
                                        <p className="text-2xl font-bold">
                                            {formatCurrency(report.grand_total_invoice)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-gray-400 text-sm">安全協力会費合計</p>
                                        <p className="text-2xl font-bold text-red-400">
                                            {report.grand_total_safety > 0
                                                ? `-${formatCurrency(report.grand_total_safety)}`
                                                : '-'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-gray-400 text-sm">差引支払額合計</p>
                                        <p className="text-2xl font-bold text-emerald-400">
                                            {formatCurrency(report.grand_total_net)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* 未生成時 */}
                {!report && !loading && !error && (
                    <div className="bg-gray-50 rounded-lg p-12 text-center">
                        <p className="text-gray-400 text-lg mb-2">年月を選択して「表示」をクリックしてください</p>
                        <p className="text-gray-400 text-sm">承認済みの請求書データから支払い表を生成します</p>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default PaymentReportPage;
