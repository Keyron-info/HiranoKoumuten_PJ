// frontend/src/types/index.ts

// ユーザー型
export interface User {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  user_type: 'internal' | 'customer' | 'admin';
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
  site_password?: string;
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
  mentioned_usernames?: string[];
}

// メンション可能ユーザー型
export interface MentionableUser {
  id: number;
  username: string;
  display_name: string;
  position: string;
}

// 請求書型（一覧用）
export interface InvoiceListItem {
  id: number;
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
  submitted_at?: string;  // 提出日時
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

// ==========================================
// Phase 3: 新要件の型定義
// ==========================================

// 工種型（15種類）
export interface ConstructionType {
  id: number;
  code: string;
  name: string;
  description: string;
  usage_count: number;
  is_active: boolean;
  display_order: number;
}

// 注文書型
export interface PurchaseOrder {
  id: number;
  order_number: string;
  customer_company: number;
  customer_company_name: string;
  issuing_company: number;
  construction_site: number;
  construction_site_name: string;
  construction_type: number | null;
  construction_type_name: string | null;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  issue_date: string;
  delivery_date: string | null;
  status: 'draft' | 'issued' | 'accepted' | 'completed' | 'cancelled';
  status_display: string;
  pdf_file: string | null;
  notes: string;
  items: PurchaseOrderItem[];
  invoiced_amount: number;
  remaining_amount: number;
  created_by: number;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

// 注文書明細型
export interface PurchaseOrderItem {
  id?: number;
  item_number: number;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  amount: number;
}

// 変更履歴型
export interface InvoiceChangeHistory {
  id: number;
  invoice: number;
  change_type: string;
  change_type_display: string;
  field_name: string;
  old_value: string;
  new_value: string;
  change_reason: string;
  changed_by: number;
  changed_by_name: string;
  changed_at: string;
}

// システム通知型
export interface SystemNotification {
  id: number;
  recipient: number;
  notification_type: 'reminder' | 'deadline' | 'approval' | 'alert' | 'info';
  notification_type_display: string;
  priority: 'low' | 'medium' | 'high';
  priority_display: string;
  title: string;
  message: string;
  action_url: string;
  related_invoice: number | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

// アクセスログ型
export interface AccessLog {
  id: number;
  user: number;
  user_name: string;
  action: string;
  action_display: string;
  resource_type: string;
  resource_id: string;
  ip_address: string | null;
  user_agent: string;
  details: Record<string, any>;
  timestamp: string;
}

// 一斉承認スケジュール型
export interface BatchApprovalSchedule {
  id: number;
  period: number;
  period_name: string;
  scheduled_datetime: string;
  is_executed: boolean;
  executed_at: string | null;
  executed_by: number | null;
  executed_by_name: string | null;
  target_supervisor_count: number;
  target_invoice_count: number;
  notes: string;
  created_at: string;
}

// 工事現場詳細型（予算情報付き）
export interface ConstructionSiteDetail extends ConstructionSite {
  is_completed: boolean;
  completion_date: string | null;
  completed_by: number | null;
  completed_by_name: string | null;
  total_budget: number;
  budget_alert_threshold: number;
  total_invoiced_amount: number;
  budget_consumption_rate: number;
  is_budget_exceeded: boolean;
  is_budget_alert: boolean;
}

// 請求書詳細型（拡張版）
export interface InvoiceDetail extends Invoice {
  document_type: 'invoice' | 'delivery_note';
  document_type_display: string;
  construction_type: number | null;
  construction_type_name: string | null;
  construction_type_other: string;
  purchase_order: number | null;
  purchase_order_number: string | null;
  purchase_order_amount: number | null;
  received_at: string | null;
  correction_deadline: string | null;
  is_correction_allowed: boolean;
  is_correction_allowed_now: boolean;
  correction_deadline_display: string | null;
  amount_check_result: 'not_checked' | 'matched' | 'over' | 'under' | 'no_order';
  amount_check_result_display: string;
  amount_difference: number;
  safety_cooperation_fee: number;
  safety_fee_notified: boolean;
  change_histories: InvoiceChangeHistory[];
}

// 現場別支払い集計型（円グラフ用）
export interface SitePaymentSummary {
  site_id: number;
  site_name: string;
  total_amount: number;
  percentage: number;
  budget: number | null;
  budget_rate: number | null;
  is_alert: boolean;
}

// 月別業者別集計型
export interface MonthlyCompanySummary {
  company_id: number;
  company_name: string;
  month: string;
  invoice_count: number;
  total_amount: number;
  approved_count: number;
  pending_count: number;
}

// アラート現場型
export interface AlertSite {
  id: number;
  name: string;
  budget: number;
  invoiced: number;
  consumption_rate: number;
  is_exceeded: boolean;
  alert_type: 'exceeded' | 'warning';
}

// 金額照合結果型
export interface AmountVerificationResult {
  status: 'matched' | 'over' | 'under' | 'no_order';
  message: string;
  invoice_amount: number;
  order_amount: number | null;
  difference: number | null;
  order_number?: string;
  auto_approve?: boolean;
  requires_additional_approval?: boolean;
  alert?: string;
}

// 請求書作成フォーム型（拡張版）
export interface InvoiceCreateFormExtended extends InvoiceCreateForm {
  document_type: 'invoice' | 'delivery_note';
  construction_type: number | null;
  construction_type_other: string;
  purchase_order: number | null;
}

// 金額照合結果の色
export const AMOUNT_CHECK_COLORS: Record<string, string> = {
  not_checked: 'gray',
  matched: 'green',
  over: 'red',
  under: 'yellow',
  no_order: 'gray',
};

// 書類タイプ
export const DOCUMENT_TYPES = {
  invoice: '請求書',
  delivery_note: '納品書',
};