import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { invoiceAPI } from '../api/invoices';
import { DashboardStats, Invoice } from '../types';
import Layout from '../components/common/Layout';
import styles from './Dashboard.module.css';

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [statsData, invoicesData] = await Promise.all([
          invoiceAPI.getDashboardStats(),
          invoiceAPI.getInvoices({ page: 1 }),
        ]);
        setStats(statsData);
        setRecentInvoices(invoicesData.results.slice(0, 5));
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, string> = {
      draft: '下書き',
      submitted: '提出済み',
      supervisor_review: '確認中',
      approved: '承認済み',
      rejected: '差し戻し',
      paid: '支払済み',
    };

    return (
      <span className={`${styles.statusBadge} ${styles[status]}`}>
        {statusConfig[status] || status}
      </span>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  if (loading) {
    return (
      <Layout>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p className="mt-4 text-gray-600 font-medium">読み込み中...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className={styles.dashboard}>
        {/* ヘッダー */}
        <div className={styles.headerCard}>
          <div className={styles.headerContent}>
            <div>
              <h1 className={styles.headerTitle}>ダッシュボード</h1>
              <p className={styles.headerSubtitle}>
                ようこそ、<span className={styles.userName}>{user?.last_name} {user?.first_name}</span>さん
              </p>
            </div>
            <div className={styles.userAvatar}>
              {user?.last_name?.charAt(0)}
            </div>
          </div>
        </div>

        {/* 統計カード */}
        <div className={styles.statsGrid}>
          {/* 総請求書数 */}
          <div className={`${styles.statCard} ${styles.blue}`}>
            <div className={styles.statCardContent}>
              <div className={styles.statInfo}>
                <p className={styles.statLabel}>総請求書数</p>
                <p className={`${styles.statValue} ${styles.blue}`}>
                  {stats?.total_invoices || 0}
                </p>
                <p className={styles.statSubtext}>全期間</p>
              </div>
              <div className={`${styles.statIcon} ${styles.blue}`}>
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>

          {/* 承認待ち */}
          <div className={`${styles.statCard} ${styles.yellow}`}>
            <div className={styles.statCardContent}>
              <div className={styles.statInfo}>
                <p className={styles.statLabel}>承認待ち</p>
                <p className={`${styles.statValue} ${styles.yellow}`}>
                  {stats?.pending_approval || 0}
                </p>
                <p className={`${styles.statSubtext} ${styles.warning}`}>要対応</p>
              </div>
              <div className={`${styles.statIcon} ${styles.yellow} ${styles.pulseIcon}`}>
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* 承認済み */}
          <div className={`${styles.statCard} ${styles.green}`}>
            <div className={styles.statCardContent}>
              <div className={styles.statInfo}>
                <p className={styles.statLabel}>承認済み</p>
                <p className={`${styles.statValue} ${styles.green}`}>
                  {stats?.approved || 0}
                </p>
                <p className={styles.statSubtext}>今月</p>
              </div>
              <div className={`${styles.statIcon} ${styles.green}`}>
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* 差し戻し */}
          <div className={`${styles.statCard} ${styles.red}`}>
            <div className={styles.statCardContent}>
              <div className={styles.statInfo}>
                <p className={styles.statLabel}>差し戻し</p>
                <p className={`${styles.statValue} ${styles.red}`}>
                  {stats?.rejected || 0}
                </p>
                <p className={styles.statSubtext}>今月</p>
              </div>
              <div className={`${styles.statIcon} ${styles.red}`}>
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* 最近の請求書テーブル */}
        <div className={styles.tableContainer}>
          <div className={styles.tableHeader}>
            <h2 className={styles.tableTitle}>最近の請求書</h2>
            <Link to="/invoices" className={styles.viewAllButton}>
              すべて表示
            </Link>
          </div>

          {loading ? (
            <div className={styles.loadingContainer}>
              <div className={styles.spinner}></div>
            </div>
          ) : recentInvoices.length === 0 ? (
            <div className={styles.emptyContainer}>
              <svg className={styles.emptyIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className={styles.emptyTitle}>まだ請求書がありません</p>
              <p className={styles.emptySubtitle}>協力会社から請求書が提出されると、ここに表示されます。</p>
            </div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>請求書番号</th>
                  <th>工事現場</th>
                  <th>請求日</th>
                  <th>金額</th>
                  <th>ステータス</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {recentInvoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td className={styles.invoiceNumber}>{invoice.invoice_number}</td>
                    <td className={styles.siteName}>{invoice.construction_site_name || '—'}</td>
                    <td className={styles.date}>{formatDate(invoice.invoice_date)}</td>
                    <td className={styles.amount}>{formatCurrency(invoice.total_amount)}</td>
                    <td>{getStatusBadge(invoice.status)}</td>
                    <td>
                      <Link to={`/invoices/${invoice.id}`} className={styles.detailButton}>
                        詳細
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default DashboardPage;