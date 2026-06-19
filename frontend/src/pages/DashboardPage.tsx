import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle, Clock, CreditCard, TrendingUp, ArrowRight, Calendar, PieChart as PieChartIcon, Download } from 'lucide-react';
import { invoiceAPI, reportAPI, invoicePeriodAPI, chartDataAPI } from '../api/invoices';
import Layout from '../components/common/Layout';
import { useAuth } from '../contexts/AuthContext';
import PieChart from '../components/common/PieChart';
import CSVExportButton from '../components/common/CSVExportButton';

interface StatItem {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ size?: number }>;
  color: string;
  bg: string;
  border: string;
}

interface RecentInvoice {
  id: number;
  invoice_number: string;
  customer_company_name: string;
  construction_site_name_display?: string;
  project_name?: string;
  total_amount: number;
  status: string;
  status_display: string;
  invoice_date: string;
}

interface AlertItem {
  type: 'warning' | 'danger';
  message: string;
  project?: string;
  count?: number;
}

interface BudgetItem {
  project: string;
  used: number;
  total: number;
  alert: boolean;
}

interface SitePaymentData {
  name: string;
  value: number;
  color: string;
  isAlert?: boolean;
}

interface InvoicePeriod {
  id: number;
  year: number;
  month: number;
  start_date: string;
  end_date: string;
  deadline_date: string;
  is_active: boolean;
  is_closed: boolean;
  // 提出受付状態（受付ルール: 当月26日〜月末）
  submission_status?: 'before' | 'open' | 'closed';
  submission_start?: string;
  submission_end?: string;
}

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StatItem[]>([]);
  const [recentInvoices, setRecentInvoices] = useState<RecentInvoice[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [currentPeriod, setCurrentPeriod] = useState<InvoicePeriod | null>(null);
  const [sitePaymentData, setSitePaymentData] = useState<SitePaymentData[]>([]);
  const [monthlyTrendData, setMonthlyTrendData] = useState<Array<{ month: number; total_amount: number; invoice_count: number }>>([]);

  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // ダッシュボード統計を取得
      const dashboardStats = await invoiceAPI.getDashboardStats() as any;

      // 統計データを設定（内部ユーザー用・役職別）
      if (user?.user_type === 'internal') {
        const pos = user.position || '';
        const isSupervisor = pos === 'site_supervisor';
        const isExec = ['president', 'senior_managing_director', 'managing_director', 'director'].includes(pos);
        const isAccountant = ['accountant', 'admin'].includes(pos);

        const internalCards: StatItem[] = [];

        // B: 自分の承認待ち（全役職共通・金額／件数はラベル）
        internalCards.push({
          label: `承認待ち（自分）${dashboardStats.my_pending_approvals || 0}件`,
          value: formatCurrency(dashboardStats.my_pending_amount || 0),
          icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100',
        });

        if (isSupervisor) {
          // A: 承認済み累計（自分）— 現場所長のみ
          internalCards.push({
            label: `承認済み累計（自分）${dashboardStats.my_approved_count || 0}件`,
            value: formatCurrency(dashboardStats.my_approved_total || 0),
            icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100',
          });
        } else {
          // C: 進行中合計（全社）— 役員・経理
          internalCards.push({
            label: `進行中合計（全社）${dashboardStats.submitted_count || 0}件`,
            value: formatCurrency(dashboardStats.submitted_total_amount || 0),
            icon: CreditCard, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100',
          });
        }

        // 役員・経理には全社の参考カードも追加
        if (isExec || isAccountant) {
          internalCards.push({
            label: '協力会社数', value: dashboardStats.partner_companies || 0,
            icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100',
          });
          internalCards.push({
            label: '今月の支払額', value: formatCurrency(dashboardStats.monthly_payment || 0),
            icon: CreditCard, color: 'text-primary-600', bg: 'bg-primary-50', border: 'border-primary-100',
          });
        }

        setStats(internalCards);
        setPendingCount(dashboardStats.my_pending_approvals || 0);
      } else {
        // 協力会社用
        setStats([
          { label: '下書き', value: dashboardStats.draft_count || 0, icon: Clock, color: 'text-slate-500', bg: 'bg-slate-50', border: 'border-slate-100' },
          { label: '提出済み', value: dashboardStats.submitted_count || 0, icon: CheckCircle, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
          { label: '承認済み', value: dashboardStats.approved_count || 0, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
          { label: '合計金額', value: formatCurrency(dashboardStats.total_amount_pending || 0), icon: CreditCard, color: 'text-primary-600', bg: 'bg-primary-50', border: 'border-primary-100' },
        ]);
        setPendingCount(0);
      }

      // 最近の請求書を取得
      try {
        const recent = await invoiceAPI.getRecentInvoices() as any[];
        setRecentInvoices(recent.slice(0, 5) as RecentInvoice[]);
      } catch (error) {
        console.error('Failed to fetch recent invoices:', error);
        setRecentInvoices([]);
      }

      // 請求書受付期間を取得（協力会社向け）
      if (user?.user_type === 'customer') {
        try {
          const period = await invoicePeriodAPI.getCurrentPeriod();
          setCurrentPeriod(period);
        } catch (error) {
          console.error('Failed to fetch current period:', error);
        }
      }

      // アラート現場を取得（内部ユーザーのみ）
      if (user?.user_type === 'internal') {
        try {
          const alertData = await reportAPI.getAlertSites();
          const alertMessages: AlertItem[] = [];

          if (alertData.sites) {
            alertData.sites.forEach(site => {
              if (site.consumption_rate >= 80) {
                alertMessages.push({
                  type: site.consumption_rate >= 100 ? 'danger' : 'warning',
                  message: `${site.name}の予算消化率が${site.consumption_rate.toFixed(0)}%に達しています`,
                  project: site.name
                });
              }
            });
          }

          setAlerts(alertMessages);

          // 予算消化率データ
          if (alertData.sites) {
            setBudgetItems(alertData.sites.slice(0, 4).map(site => ({
              project: site.name,
              used: (site.invoiced || 0) / 1000000,
              total: site.budget / 1000000,
              alert: site.consumption_rate >= 90
            })));
          }
        } catch (error) {
          console.error('Failed to fetch alert sites:', error);
        }

        // 円グラフデータを取得
        try {
          const chartData = await chartDataAPI.getSitePaymentSummary();
          const COLORS = ['#f97316', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#3b82f6', '#84cc16', '#6366f1'];

          setSitePaymentData(chartData.sites.map((site, index) => ({
            name: site.site_name,
            value: site.amount,
            color: site.is_alert ? '#ef4444' : COLORS[index % COLORS.length],
            isAlert: site.is_alert
          })));
        } catch (error) {
          console.error('Failed to fetch chart data:', error);
        }

        // 月次請求額推移データを取得
        try {
          const currentYear = new Date().getFullYear();
          const trendData = await chartDataAPI.getMonthlyTrend(currentYear);
          setMonthlyTrendData(trendData);
        } catch (error) {
          console.error('Failed to fetch monthly trend data:', error);
          // エラー時は空配列を設定
          setMonthlyTrendData([]);
        }
      }

    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ja-JP');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending_approval': return 'bg-orange-50 text-orange-700 border-orange-100';
      case 'approved': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'paid': return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'rejected': return 'bg-rose-50 text-rose-700 border-rose-100';
      case 'returned': return 'bg-rose-50 text-rose-700 border-rose-100';
      default: return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
            <p className="text-slate-500">読み込み中...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* ヘッダー */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">ダッシュボード</h1>
          <p className="text-slate-500 mt-1">請求書管理システムの概要と最新状況を確認できます</p>
        </div>

        {/* 統計カード */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <div key={index} className={`bg-white rounded-xl border ${stat.border} p-6 shadow-sm hover:shadow-md transition-shadow duration-200`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">{stat.label}</p>
                  <p className="text-2xl font-bold text-slate-900 tracking-tight">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-lg ${stat.bg} ${stat.color}`}>
                  <stat.icon size={20} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 請求書受付期間（協力会社向け） */}
        {user?.user_type === 'customer' && (
          <>
            {currentPeriod ? (
              <div className="bg-gradient-to-br from-primary-600 to-primary-800 rounded-2xl shadow-lg p-6 lg:p-8 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl"></div>
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex items-start gap-5">
                    <div className="hidden sm:flex bg-white/20 p-4 rounded-xl backdrop-blur-sm">
                      <Calendar size={32} />
                    </div>
                    <div>
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mb-2 border ${
                        currentPeriod.submission_status === 'open'
                          ? 'bg-primary-500/50 border-primary-400/30'
                          : currentPeriod.submission_status === 'before'
                            ? 'bg-yellow-500/40 border-yellow-300/40'
                            : 'bg-gray-500/40 border-gray-300/40'
                      }`}>
                        {currentPeriod.submission_status === 'open'
                          ? '提出受付中'
                          : currentPeriod.submission_status === 'before'
                            ? `提出受付前（作成は可能）`
                            : '受付終了'}
                      </span>
                      <h3 className="text-2xl font-bold mb-2">
                        {currentPeriod.year}年{currentPeriod.month}月分 請求書
                      </h3>
                      <div className="flex flex-col sm:flex-row gap-2 sm:gap-6 text-primary-100">
                        <p>対象期間: {new Date(currentPeriod.start_date).toLocaleDateString('ja-JP')} 〜 {new Date(currentPeriod.end_date).toLocaleDateString('ja-JP')}</p>
                        <p>提出期間: <span className="font-bold text-white">
                          {currentPeriod.submission_start ? new Date(currentPeriod.submission_start).toLocaleDateString('ja-JP') : '-'} 〜 {currentPeriod.submission_end ? new Date(currentPeriod.submission_end).toLocaleDateString('ja-JP') : '-'}
                        </span></p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate('/invoices/create')}
                    className="w-full md:w-auto bg-white text-primary-700 px-6 py-3.5 rounded-xl font-bold hover:bg-primary-50 transition shadow-lg flex items-center justify-center gap-2 group"
                  >
                    <span>請求書を作成</span>
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-2xl shadow-lg p-6 text-white overflow-hidden relative">
                <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl"></div>
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className="bg-white/20 p-3 rounded-xl">
                      <Calendar size={28} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">請求書を作成しましょう</h3>
                      <p className="text-emerald-100 opacity-90">いつでも新しい請求書を作成・下書き保存できます</p>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate('/invoices/create')}
                    className="w-full md:w-auto bg-white text-emerald-700 px-6 py-3 rounded-lg font-bold hover:bg-emerald-50 transition shadow-md flex items-center justify-center gap-2"
                  >
                    <span>請求書を作成</span>
                    <ArrowRight size={18} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* 承認待ちバナー（内部ユーザーのみ） */}
        {user?.user_type === 'internal' && pendingCount > 0 && (
          <div className="bg-gradient-to-r from-primary-500 to-emerald-500 rounded-2xl shadow-md p-6 text-white">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                  <AlertCircle size={28} />
                </div>
                <div>
                  <h3 className="text-xl font-bold">承認が必要な請求書があります</h3>
                  <p className="text-white/90">現在 {pendingCount} 件の請求書があなたの承認を待っています</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/my-approvals')}
                className="bg-white text-orange-600 px-6 py-3 rounded-lg font-bold hover:bg-orange-50 transition shadow-sm flex items-center gap-2"
              >
                <span>確認画面へ</span>
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* アラート */}
        {alerts.length > 0 && (
          <div className="space-y-3">
            {alerts.map((alert, index) => (
              <div key={index} className={`p-4 rounded-xl border flex items-start gap-3 ${alert.type === 'danger' ? 'bg-rose-50 border-rose-100 text-rose-800' : 'bg-amber-50 border-amber-100 text-amber-800'
                }`}>
                <AlertCircle size={20} className={`mt-0.5 flex-shrink-0 ${alert.type === 'danger' ? 'text-rose-600' : 'text-amber-600'
                  }`} />
                <span className="text-sm font-medium">{alert.message}</span>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左カラム: 最近の請求書 (2/3幅) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h2 className="text-lg font-bold text-slate-800">最近の請求書</h2>
                <button
                  onClick={() => navigate('/invoices')}
                  className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1 hover:underline"
                >
                  すべて見る <ArrowRight size={14} />
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">番号/日付</th>
                      <th className="text-left py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">取引先/工事名</th>
                      <th className="text-right py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">金額</th>
                      <th className="text-center py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">状態</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentInvoices.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-12 text-center text-slate-500">
                          データがありません
                        </td>
                      </tr>
                    ) : (
                      recentInvoices.map((invoice) => (
                        <tr
                          key={invoice.id}
                          className="hover:bg-slate-50 transition-colors cursor-pointer group"
                          onClick={() => navigate(`/invoices/${invoice.id}`)}
                        >
                          <td className="py-4 px-6">
                            <div className="text-sm font-medium text-slate-900 group-hover:text-primary-600 transition-colors">{invoice.invoice_number}</div>
                            <div className="text-xs text-slate-500 mt-0.5">{formatDate(invoice.invoice_date)}</div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="text-sm text-slate-900">{invoice.customer_company_name}</div>
                            <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                              {invoice.construction_site_name_display || invoice.project_name || '-'}
                            </div>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <span className="text-sm font-bold text-slate-900">{formatCurrency(invoice.total_amount)}</span>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(invoice.status)}`}>
                              {invoice.status_display}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 月次推移グラフ (内部ユーザー用) */}
            {user?.user_type === 'internal' && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <TrendingUp size={20} className="text-primary-600" />
                  <span>月次請求額推移</span>
                </h3>
                {monthlyTrendData.length === 0 ? (
                  <div className="h-48 flex items-center justify-center text-slate-400 bg-slate-50 rounded-lg border-2 border-dashed border-slate-100">
                    データがありません
                  </div>
                ) : (
                  <div className="h-64 flex items-end justify-between gap-2 px-2">
                    {(() => {
                      const maxAmount = Math.max(...monthlyTrendData.map(d => d.total_amount), 1);
                      return monthlyTrendData.map((data) => {
                        const height = maxAmount > 0 ? (data.total_amount / maxAmount) * 100 : 0;
                        return (
                          <div key={data.month} className="flex-1 flex flex-col justify-end group h-full">
                            <div className="relative w-full bg-primary-100 rounded-t-sm group-hover:bg-primary-200 transition-colors" style={{ height: `${height}%` }}>
                              <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                                {data.month}月: {formatCurrency(data.total_amount)}
                              </div>
                            </div>
                            <div className="text-center text-xs text-slate-400 mt-2 font-medium">{data.month}月</div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 右カラム: サイドウィジェット (1/3幅) */}
          <div className="space-y-6">
            {/* 予算消化率 (経営層のみ) */}
            {user?.user_type === 'internal' && ['president', 'senior_managing_director', 'managing_director', 'director', 'admin', 'accountant'].includes(user.position || '') && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4">予算消化状況</h3>
                <div className="space-y-5">
                  {budgetItems.length === 0 ? (
                    <p className="text-slate-500 text-center py-8 text-sm">予算データがありません</p>
                  ) : (
                    budgetItems.map((item, index) => {
                      const percentage = item.total > 0 ? Math.min((item.used / item.total) * 100, 100) : 0;
                      return (
                        <div key={index}>
                          <div className="flex justify-between mb-1.5">
                            <span className="text-sm font-medium text-slate-700 truncate max-w-[60%]">{item.project}</span>
                            <span className={`text-xs font-bold ${item.alert ? 'text-rose-600' : 'text-slate-500'}`}>
                              {percentage.toFixed(0)}%
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${item.alert ? 'bg-rose-500' : 'bg-primary-500'}`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <div className="flex justify-end mt-1">
                            <span className="text-[10px] text-slate-400">
                              {item.used.toFixed(1)}M / {item.total.toFixed(1)}M
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* 現場別割合 (円グラフ) - 経営層のみ */}
            {user?.user_type === 'internal' && ['president', 'senior_managing_director', 'managing_director', 'director', 'admin'].includes(user.position || '') && sitePaymentData.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <PieChartIcon size={20} className="text-primary-600" />
                    <span>現場別割合</span>
                  </h3>
                </div>
                <div className="flex justify-center py-2">
                  <PieChart
                    data={sitePaymentData}
                    showLegend={false} // スペース節約のため凡例は非表示または調整
                    size={180}
                  />
                </div>
                <div className="mt-4 space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                  {sitePaymentData.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                        <span className="text-slate-600 truncate max-w-[120px]">{item.name}</span>
                      </div>
                      <span className="font-medium text-slate-700">{formatCurrency(item.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 管理メニュー (管理者・経理のみ) */}
            {user?.user_type === 'internal' && ['admin', 'accountant'].includes(user.position || '') && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <span className="p-1 bg-slate-100 rounded text-slate-600">🛠️</span>
                  管理メニュー
                </h3>
                <div className="space-y-3">
                  <button
                    onClick={() => navigate('/admin/sites')}
                    className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-50 text-orange-600 rounded-lg group-hover:bg-orange-100 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                        </svg>
                      </div>
                      <div className="text-left">
                        <span className="block text-sm font-bold text-slate-700">現場管理</span>
                        <span className="block text-xs text-slate-500">現場・パスワード設定</span>
                      </div>
                    </div>
                    <ArrowRight size={16} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
                  </button>

                  <button
                    onClick={() => navigate('/admin/users')}
                    className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-100 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                          <circle cx="9" cy="7" r="4"></circle>
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                        </svg>
                      </div>
                      <div className="text-left">
                        <span className="block text-sm font-bold text-slate-700">ユーザー管理</span>
                        <span className="block text-xs text-slate-500">社員・協力会社</span>
                      </div>
                    </div>
                    <ArrowRight size={16} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
                  </button>

                  <button
                    onClick={() => navigate('/admin/registration-requests')}
                    className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-emerald-100 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                          <line x1="16" y1="13" x2="8" y2="13"></line>
                          <line x1="16" y1="17" x2="8" y2="17"></line>
                          <polyline points="10 9 9 9 8 9"></polyline>
                        </svg>
                      </div>
                      <div className="text-left">
                        <span className="block text-sm font-bold text-slate-700">登録申請</span>
                        <span className="block text-xs text-slate-500">新規ユーザー承認</span>
                      </div>
                    </div>
                    <ArrowRight size={16} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            )}

            {/* レポート出力 (管理者・経理のみ) */}
            {user?.user_type === 'internal' && ['admin', 'accountant'].includes(user.position || '') && (
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl shadow-sm p-6 text-white">
                <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                  <Download size={20} className="text-emerald-400" />
                  レポート出力
                </h3>
                <p className="text-slate-300 text-sm mb-4">
                  各種集計データをCSV形式でダウンロード
                </p>
                <div className="flex flex-wrap gap-2">
                  <CSVExportButton year={new Date().getFullYear()} showDropdown={true} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};
export default DashboardPage;
