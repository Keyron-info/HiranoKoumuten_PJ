import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, ChevronLeft, ChevronRight, Eye, Plus } from 'lucide-react';
import { invoiceAPI, constructionSiteAPI } from '../api/invoices';
import { InvoiceListItem, ConstructionSite } from '../types';
import Layout from '../components/common/Layout';
import { useAuth } from '../contexts/AuthContext';

// ユニーク配列を作成するヘルパー関数
const uniqueArray = <T,>(arr: T[]): T[] => {
  return arr.filter((item, index) => arr.indexOf(item) === index);
};

const InvoiceListPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [projects, setProjects] = useState<ConstructionSite[]>([]);

  const itemsPerPage = 20;

  useEffect(() => {
    fetchInvoices();
    fetchFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, statusFilter]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const response = await invoiceAPI.getInvoices({
        status: statusFilter === 'all' ? undefined : statusFilter,
        page: currentPage,
        search: searchQuery || undefined,
      });

      setInvoices(response.results || []);
      setTotalCount(response.count || 0);
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchFilters = async () => {
    try {
      // 工事現場一覧
      const sites = await constructionSiteAPI.getSites();
      setProjects(Array.isArray(sites) ? sites : []);
    } catch (error) {
      console.error('Failed to fetch filters:', error);
      setProjects([]);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchInvoices();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setProjectFilter('all');
    setCompanyFilter('all');
    setCurrentPage(1);
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
      case 'pending_approval': return 'bg-primary-100 text-primary-700 border-primary-200';
      case 'approved': return 'bg-green-100 text-green-700 border-green-200';
      case 'paid': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'rejected': return 'bg-red-100 text-red-700 border-red-200';
      case 'returned': return 'bg-red-100 text-red-700 border-red-200';
      case 'draft': return 'bg-gray-100 text-gray-700 border-gray-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  // フィルタリング（クライアント側）
  const filteredInvoices = invoices.filter((invoice) => {
    const matchesProject = projectFilter === 'all' ||
      invoice.construction_site_name_display === projectFilter ||
      invoice.project_name === projectFilter;
    const matchesCompany = companyFilter === 'all' ||
      invoice.customer_company_name === companyFilter;
    return matchesProject && matchesCompany;
  });

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  // ユニークな会社名を抽出
  const uniqueCompanies = uniqueArray(invoices.map(inv => inv.customer_company_name));

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* ヘッダー */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">請求書一覧</h1>
            <p className="text-gray-600">全ての請求書を管理</p>
          </div>
          {user?.user_type === 'customer' && (
            <button
              onClick={() => navigate('/invoices/create')}
              className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg font-medium hover:from-primary-600 hover:to-primary-700 transition-all shadow-lg hover:shadow-xl"
            >
              <Plus size={20} />
              <span>新規作成</span>
            </button>
          )}
        </div>

        {/* フィルター */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center space-x-2 mb-4">
            <Filter size={20} className="text-gray-600" />
            <h3 className="font-bold text-gray-900">フィルター・検索</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 検索 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">検索</label>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="請求書番号、会社名で検索"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
            </div>

            {/* ステータス */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">ステータス</label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">すべて</option>
                <option value="draft">下書き</option>
                <option value="submitted">提出済み</option>
                <option value="pending_approval">承認待ち</option>
                <option value="approved">承認済み</option>
                <option value="paid">支払済み</option>
                <option value="returned">差し戻し</option>
                <option value="rejected">却下</option>
              </select>
            </div>

            {/* 工事現場 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">工事現場</label>
              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">すべて</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.name}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 協力会社 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">協力会社</label>
              <select
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">すべて</option>
                {uniqueCompanies.map((company) => (
                  <option key={company} value={company}>
                    {company}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
            <p>{filteredInvoices.length}件の請求書が見つかりました</p>
            <button
              onClick={clearFilters}
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              フィルターをクリア
            </button>
          </div>
        </div>

        {/* 請求書テーブル */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left py-4 px-6 text-sm font-medium text-gray-600">請求書番号</th>
                      <th className="text-left py-4 px-6 text-sm font-medium text-gray-600">提出日</th>
                      <th className="text-left py-4 px-6 text-sm font-medium text-gray-600">協力会社</th>
                      <th className="text-left py-4 px-6 text-sm font-medium text-gray-600">工事名</th>
                      <th className="text-right py-4 px-6 text-sm font-medium text-gray-600">請求金額</th>
                      <th className="text-center py-4 px-6 text-sm font-medium text-gray-600">ステータス</th>
                      <th className="text-center py-4 px-6 text-sm font-medium text-gray-600">アクション</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredInvoices.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-gray-500">
                          <p className="text-lg mb-2">請求書が見つかりませんでした</p>
                          <p className="text-sm">検索条件を変更してください</p>
                        </td>
                      </tr>
                    ) : (
                      filteredInvoices.map((invoice) => (
                        <tr
                          key={invoice.id}
                          className="hover:bg-gray-50 transition-colors cursor-pointer"
                          onClick={() => navigate(`/invoices/${invoice.id}`)}
                        >
                          <td className="py-4 px-6">
                            <span className="font-medium text-gray-900">{invoice.invoice_number}</span>
                          </td>
                          <td className="py-4 px-6 text-sm text-gray-600">
                            {formatDate(invoice.invoice_date)}
                          </td>
                          <td className="py-4 px-6 text-sm text-gray-900">
                            {invoice.customer_company_name}
                          </td>
                          <td className="py-4 px-6 text-sm text-gray-600">
                            {invoice.construction_site_name_display || invoice.project_name || '-'}
                          </td>
                          <td className="py-4 px-6 text-sm text-right font-medium text-gray-900">
                            {formatCurrency(invoice.total_amount)}
                          </td>
                          <td className="py-4 px-6 text-center">
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(invoice.status)}`}>
                              {invoice.status_display}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/invoices/${invoice.id}`);
                              }}
                              className="inline-flex items-center space-x-1 text-blue-600 hover:text-blue-700 font-medium text-sm"
                            >
                              <Eye size={16} />
                              <span>詳細</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* ページネーション */}
              {totalCount > 0 && (
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, totalCount)} / {totalCount}件
                  </p>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      let page: number;
                      if (totalPages <= 5) {
                        page = i + 1;
                      } else if (currentPage <= 3) {
                        page = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        page = totalPages - 4 + i;
                      } else {
                        page = currentPage - 2 + i;
                      }
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`px-4 py-2 rounded-lg font-medium transition-colors ${page === currentPage
                              ? 'bg-primary-500 text-white'
                              : 'border border-gray-300 hover:bg-gray-50'
                            }`}
                        >
                          {page}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default InvoiceListPage;
