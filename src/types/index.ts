export type Role = 'owner' | 'admin' | 'project_manager' | 'member' | 'guest';

export type UserStatus = 'online' | 'busy' | 'away' | 'offline';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface User {
  id: string;
  email: string;
  full_name: string;
  username?: string;
  avatar_url?: string;
  role: Role;
  title?: string;
  department?: string;
  status: UserStatus;
  approval_status?: ApprovalStatus;
  created_at: string;
}

export interface WorkspaceInvite {
  id: string;
  workspace_id: string;
  email: string;
  token: string;
  role: Role;
  invited_by: string;
  invited_by_name?: string;
  status: 'pending' | 'accepted' | 'approved' | 'rejected' | 'expired';
  username?: string;
  full_name?: string;
  password?: string;
  created_at: string;
  expires_at: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  /** Storage object path inside the `workspace-logos` bucket (used to remove old logos). */
  logo_path?: string;
  /** Short brand line shown under the workspace name, e.g. "Design & Development". */
  tagline?: string;
  description?: string;
  owner_id: string;
  plan: 'free' | 'pro' | 'enterprise';
  created_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: Role;
  joined_at: string;
  user: User;
}

export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'archived';
export type PriorityLevel = 'urgent' | 'high' | 'medium' | 'low';

export type ProjectBillingType = "fixed" | "hourly";
export type PaymentSchedule = "weekly" | "15_days" | "30_days" | "custom";

export interface BankDetails {
  account_name: string;
  bank_name: string;
  bank_iban: string;
  account_number: string;
  bank_currency: string;
  swift_bic: string;
  routing_number: string;
}

export const DEFAULT_BANK_DETAILS: BankDetails = {
  account_name: "Nevin Pandacan Alcober",
  bank_name: "Emirates NBD (ENBD)",
  bank_iban: "AE790260001015470817401",
  account_number: "1015470817401",
  bank_currency: "AED",
  swift_bic: "EBILAEAD",
  routing_number: "302620122",
};

export interface ProjectPaymentInstallment {
  id: string;
  project_id: string;
  installment_number: number;
  title: string;
  percentage?: number;
  amount: number;
  status: "pending" | "invoiced" | "paid";
  due_date?: string;
  paid_at?: string;
}

export interface Project {
  id: string;
  workspace_id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  status: ProjectStatus;
  priority: PriorityLevel;
  owner_id: string;
  start_date: string;
  target_date: string;
  progress: number;
  member_ids: string[];
  all_members?: boolean;
  members?: User[];
  milestones?: Milestone[];
  // Client link
  client_id?: string | null;
  client?: Client;
  // Pricing & Billing
  billing_type?: ProjectBillingType;
  payment_schedule?: PaymentSchedule;
  payment_terms_days?: number;
  fixed_price_amount?: number;
  payment_installments_count?: number;
  installments?: ProjectPaymentInstallment[];
  hourly_rate?: number;
  estimated_hours?: number;
  estimated_hours_per_week?: number;
  currency?: string;
  payment_status?: "unpaid" | "partially_paid" | "paid";
  paid_amount?: number;
  last_payment_date?: string;
  enable_currency_conversion?: boolean;
  converted_currency?: string;
  conversion_rate?: number;
  task_types?: string[];
  departments?: string[];
  // Bank Remittance Details
  bank_name?: string;
  account_name?: string;
  account_number?: string;
  bank_iban?: string;
  bank_currency?: string;
  swift_bic?: string;
  routing_number?: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectInvoiceItem {
  id?: string;
  description: string;
  quantity?: number;
  rate?: number;
  amount: number;
}

export interface ProjectInvoice {
  id: string;
  project_id: string;
  invoice_number: string;
  billing_type: ProjectBillingType;
  payment_schedule?: PaymentSchedule;
  payment_terms_days?: number;
  issue_date: string;
  due_date?: string;
  subtotal?: number;
  tax_rate?: number;
  tax_amount?: number;
  discount_rate?: number;
  discount_amount?: number;
  total_amount: number;
  status: "draft" | "sent" | "paid" | "overdue";
  enable_currency_conversion?: boolean;
  converted_currency?: string;
  conversion_rate?: number;
  converted_total_amount?: number;
  client_id?: string;
  client_name?: string;
  client_company?: string;
  client_email?: string;
  client_address?: string;
  client_tax_id?: string;
  provider_name?: string;
  provider_company?: string;
  provider_email?: string;
  provider_address?: string;
  bank_name?: string;
  account_name?: string;
  account_number?: string;
  bank_iban?: string;
  bank_currency?: string;
  swift_bic?: string;
  routing_number?: string;
  notes?: string;
  payment_instructions?: string;
  items?: ProjectInvoiceItem[];
}

export interface Milestone {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  target_date: string;
  completed: boolean;
  created_at: string;
}

export interface TaskColumn {
  id: string;
  workspace_id: string;
  project_id?: string;
  title: string;
  status_key: string;
  order_index: number;
  color: string;
  is_default?: boolean;
}

export interface Subtask {
  id: string;
  task_id: string;
  title: string;
  completed: boolean;
  order_index: number;
  assignee_id?: string;
  due_date?: string;
  created_at?: string;
}

export interface Client {
  id: string;
  workspace_id: string;
  name: string;
  company: string;
  email: string;
  avatar_url?: string;
  address?: string;
  tax_id?: string;
  status: "active" | "lead" | "past";
  project_ids: string[];
  created_at: string;
}

export interface ProjectFile {
  id: string;
  workspace_id: string;
  project_id?: string;
  client_id?: string;
  task_id?: string;
  name: string;
  size: number;
  type: string;
  url: string;
  uploaded_by: string;
  uploader?: User;
  uploaded_at: string;
}

export interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  uploaded_by: string;
  uploaded_at: string;
}

export interface CommentReaction {
  emoji: string;
  users: string[];
}

export interface Comment {
  id: string;
  task_id: string;
  user_id: string;
  user?: User;
  content: string;
  created_at: string;
  updated_at?: string;
  attachments?: Attachment[];
  reactions?: CommentReaction[];
}

export interface Task {
  id: string;
  workspace_id: string;
  project_id: string;
  title: string;
  description: string;
  status: string; // matches TaskColumn.status_key
  priority: PriorityLevel;
  order_index: number;
  creator_id: string;
  creator?: User;
  assignee_ids: string[];
  assignees?: User[];
  start_date?: string;
  due_date?: string;
  labels: string[];
  subtasks: Subtask[];
  attachments: Attachment[];
  comments: Comment[];
  estimated_hours?: number;
  tracked_seconds: number;
  is_timer_running?: boolean;
  is_paid?: boolean;
  paid_at?: string;
  task_type?: string;
  department?: string;
  dependencies: string[]; // task IDs
  created_at: string;
  updated_at: string;
}

export interface TimeEntry {
  id: string;
  task_id?: string;
  task_title?: string;
  workspace_id?: string;
  project_id?: string;
  project_name?: string;
  user_id: string;
  user?: User;
  description: string;
  work_summary?: string;
  duration_seconds: number;
  started_at: string;
  ended_at?: string;
  is_billable: boolean;
}

export interface Note {
  id: string;
  workspace_id: string;
  project_id?: string;
  author_id: string;
  author?: User;
  title: string;
  content: string;
  is_pinned: boolean;
  is_private: boolean;
  tags: string[];
  color?: "yellow" | "green" | "blue" | "pink" | "purple" | "orange" | string;
  created_at: string;
  updated_at: string;
}

export interface AnnouncementReaction {
  emoji: string;
  count: number;
  user_ids: string[];
}

export interface Announcement {
  id: string;
  workspace_id: string;
  project_id?: string;
  author_id: string;
  author?: User;
  title: string;
  content: string;
  priority: 'urgent' | 'important' | 'general';
  is_pinned: boolean;
  read_by: string[];
  reactions?: AnnouncementReaction[];
  created_at: string;
}

export type NotificationType =
  | 'task_assigned'
  | 'mention'
  | 'comment'
  | 'deadline'
  | 'status_change'
  | 'announcement'
  | 'system'
  | 'billing'
  | 'invoice'
  | 'delayed_payment'
  | 'delayed_task'
  | 'team';

export interface Notification {
  id: string;
  user_id: string;
  workspace_id: string;
  title: string;
  message: string;
  type: NotificationType;
  link_url?: string;
  is_read: boolean;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  workspace_id: string;
  project_id?: string;
  task_id?: string;
  user_id: string;
  user: User;
  action: string;
  details: string;
  created_at: string;
}

export interface DashboardWidgetConfig {
  id: string;
  type:
    | 'metrics_cards'
    | 'task_status_distribution'
    | 'upcoming_deadlines'
    | 'my_tasks_summary'
    | 'project_progress'
    | 'team_activity'
    | 'quick_notes_widget'
    | 'announcements_widget'
    | 'productivity_summary'
    | 'time_tracking_widget';
  title: string;
  order_index: number;
  visible: boolean;
  size: 'half' | 'full';
}

export type ActiveView =
  | 'dashboard'
  | 'my_tasks'
  | 'projects'
  | 'project_detail'
  | 'calendar'
  | 'notes'
  | 'announcements'
  | 'team'
  | 'activity'
  | 'workload'
  | 'clients'
  | 'billing'
  | 'timelogs'
  | 'settings';

export type ProjectSubTab =
  | 'overview'
  | 'board'
  | 'list'
  | 'calendar'
  | 'timeline'
  | 'files'
  | 'notes'
  | 'activity';
