// ユーザー型
export interface User {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  user_type: 'internal' | 'customer';
  role: 'partner' | 'supervisor' | 'manager' | 'executive' | 'accounting';
  company: Company;
  position: string;
  phone_number: string;
}

// 会社型
export interface Company {
  id: string;
  name: string;
  address: string;
  tax_number: string;
  business_type: string;
  is_approved: boolean;
}

// 顧客会社型
export interface CustomerCompany {
  id: string;
  name: string;
  address: string;
  contact_email: string;
  tax_number: string;
  business_type: string;
}

// 工事現場型
export interface ConstructionSite {
  id: string;
  name: string;
  location: string;
  is_active: boolean;
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

// 請求書型
export interface Invoice {
  id: string;
  invoice_number: string;
  customer_company: string;
  customer_company_name: string;
  construction_site: string;
  construction_site_name: string;
  project_name: string;
  invoice_date: string;
  payment_due_date: string;
  status: InvoiceStatus;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  notes: string;
  items: InvoiceItem[];
  created_at: string;
  updated_at: string;
}

// 請求書ステータス型
export type InvoiceStatus = 
  | 'draft'
  | 'submitted'
  | 'supervisor_review'
  | 'manager_review'
  | 'final_review'
  | 'approved'
  | 'rejected'
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

// コメント型
export interface InvoiceComment {
  id: string;
  user: User;
  comment: string;
  comment_type: 'general' | 'approval' | 'payment' | 'correction';
  timestamp: string;
}

// 承認履歴型
export interface ApprovalHistory {
  id: string;
  approver: User;
  action: 'submitted' | 'approved' | 'rejected' | 'returned';
  comment: string;
  timestamp: string;
}

// ダッシュボード統計型
export interface DashboardStats {
  total_invoices: number;
  pending_approval: number;
  approved: number;
  paid: number;
  total_amount: number;
}

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