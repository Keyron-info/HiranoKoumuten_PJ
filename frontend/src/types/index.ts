// frontend/src/types/index.ts

// ユーザー型
export interface User {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  user_type: 'internal' | 'customer';
  user_type_display: string;
  position: string;
  position_display: string;
  company: string | null;
  company_name?: string;
  department: string | null;
  customer_company: string | null;
  customer_company_name?: string;
  phone: string;
  is_active_user: boolean;
  date_joined: string;
}

// 会社型
export interface Company {
  id: string;
  name: string;
  postal_code: string;
  address: string;
  phone: string;
  email: string;
  is_active: boolean;
}

// 顧客会社型
export interface CustomerCompany {
  id: string;
  name: string;
  business_type: string;
  business_type_display: string;
  postal_code: string;
  address: string;
  phone: string;
  email: string;
  tax_number: string;
  is_active: boolean;
}

// 工事現場型
export interface ConstructionSite {
  id: string;
  name: string;
  location: string;
  company: string;
  company_name: string;
  supervisor: string | null;
  supervisor_name: string | null;
  is_active: boolean;
  created_at: string;
}

// 請求書明細型
export interface InvoiceItem {
  id?: string;
  item_number: number;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  amount: number;
}

// 承認ステップ型
export interface ApprovalStep {
  id: string;
  route: string;
  step_order: number;
  step_name: string;
  approver_position: string;
  position_display: string;
  approver_user: string | null;
  approver_name: string;
  is_required: boolean;
  timeout_days: number;
}

// 承認ルート型
export interface ApprovalRoute {
  id: string;
  company: string;
  company_name: string;
  name: string;
  description: string;
  is_active: boolean;
  is_default: boolean;
  steps: ApprovalStep[];
}

// 承認履歴型
export interface ApprovalHistory {
  id: string;
  invoice: string;
  approval_step: string | null;
  step_name: string | null;
  user: string;
  user_name: string;
  user_position: string;
  action: 'submitted' | 'approved' | 'rejected' | 'returned' | 'commented';
  action_display: string;
  comment: string;
  timestamp: string;
}

// コメント型
export interface InvoiceComment {
  id: string;
  invoice: string;
  user: string;
  user_name: string;
  user_position: string;
  comment_type: 'general' | 'approval' | 'payment' | 'correction' | 'internal_memo';
  comment_type_display: string;
  comment: string;
  is_private: boolean;
  timestamp: string;
}

// 請求書型（一覧用）
export interface InvoiceListItem {
  id: string;
  invoice_number: string;
  customer_company_name: string;
  construction_site_name_display: string;
  project_name: string;
  invoice_date: string;
  payment_due_date: string;
  status: InvoiceStatus;
  status_display: string;
  total_amount: number;
  current_approver_name: string | null;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

// 請求書型（詳細用）
export interface Invoice {
  id: string;
  invoice_number: string;
  customer_company: string;
  customer_company_name: string;
  construction_site: string;
  construction_site_name_display: string;
  project_name: string;
  invoice_date: string;
  payment_due_date: string;
  status: InvoiceStatus;
  status_display: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  notes: string;
  items: InvoiceItem[];
  approval_route: string | null;
  approval_route_detail: ApprovalRoute | null;
  current_approval_step: string | null;
  current_step_name: string | null;
  current_approver: string | null;
  current_approver_name: string | null;
  created_by: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
  comments: InvoiceComment[];
  approval_histories: ApprovalHistory[];
}

// 請求書ステータス型
export type InvoiceStatus = 
  | 'draft'
  | 'submitted'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'returned'
  | 'payment_preparing'
  | 'paid';

// 請求書作成フォーム型
export interface InvoiceCreateForm {
  construction_site: string;
  project_name: string;
  invoice_date: string;
  payment_due_date: string;
  notes: string;
  items: InvoiceItem[];
}

// ダッシュボード統計型（社内ユーザー）
export interface InternalDashboardStats {
  pending_invoices: number;
  my_pending_approvals: number;
  monthly_payment: number;
  partner_companies: number;
}

// ダッシュボード統計型（協力会社）
export interface CustomerDashboardStats {
  draft_count: number;
  submitted_count: number;
  returned_count: number;
  approved_count: number;
  total_amount_pending: number;
}

// ダッシュボード統計型（ユニオン）
export type DashboardStats = InternalDashboardStats | CustomerDashboardStats;

// APIレスポンス型
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

// ページネーション型
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// 認証トークン型
export interface AuthTokens {
  access: string;
  refresh: string;
}

// ログインフォーム型
export interface LoginForm {
  username: string;
  password: string;
}

// 登録フォーム型
export interface RegisterForm {
  username: string;
  email: string;
  password: string;
  password_confirm: string;
  first_name: string;
  last_name: string;
  company_name: string;
  phone_number: string;
}

// ステータスバッジの色
export const STATUS_COLORS: Record<InvoiceStatus, string> = {
  draft: 'gray',
  submitted: 'blue',
  pending_approval: 'yellow',
  approved: 'green',
  rejected: 'red',
  returned: 'orange',
  payment_preparing: 'purple',
  paid: 'teal',
};

// ステータス表示名
export const STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: '下書き',
  submitted: '提出済み',
  pending_approval: '承認待ち',
  approved: '承認済み',
  rejected: '却下',
  returned: '差し戻し',
  payment_preparing: '支払い準備中',
  paid: '支払い済み',
};