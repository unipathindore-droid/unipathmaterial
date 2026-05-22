export type AppRole =
  | "superadmin"
  | "admin"
  | "branch_admin"
  | "sales"
  | "phlebotomist"
  | "material_team"
  | "dispatch_manager";

export type ApprovalStatus = "pending" | "approved" | "rejected";

export type RequestStatus =
  | "draft"
  | "pending"
  | "submitted"
  | "partially_approved"
  | "approved"
  | "rejected"
  | "dispatched"
  | "delivered";

export type ApprovalDecision = "pending" | "approved" | "partially_approved" | "rejected";

export type DispatchStatus = "queued" | "packed" | "dispatched" | "delivered";

export type DeliveryStatus = "pending" | "in_transit" | "delivered" | "issue";

export interface Branch {
  id: string;
  name: string;
  code: string;
  city: string;
  state?: string | null;
}

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  role: AppRole;
  branch_id: string | null;
  is_active?: boolean;
  approval_status?: ApprovalStatus;
  invited_by?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  email_verified_at?: string | null;
  last_login_at?: string | null;
  branch?: Branch | null;
}

export interface ManagedUserRecord extends UserProfile {
  created_at?: string;
}

export interface AuditLogRecord {
  id: string;
  actor_user_id: string | null;
  subject_user_id: string | null;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
  actor_name?: string;
  subject_name?: string;
}

export interface AdminConsoleMetrics {
  totalUsers: number;
  pendingApprovals: number;
  approvedUsers: number;
  auditEvents: number;
}

export interface AdminConsoleData {
  metrics: AdminConsoleMetrics;
  users: ManagedUserRecord[];
  pendingUsers: ManagedUserRecord[];
  recentAuditLogs: AuditLogRecord[];
}

export interface Client {
  id: string;
  branch_id: string;
  name: string;
  client_code: string;
  email: string | null;
  phone?: string | null;
  contact_person?: string | null;
  address?: string | null;
  city: string | null;
  state?: string | null;
  status: "active" | "inactive";
  branch?: Branch | null;
}

export interface Material {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit_of_measure: string;
  expiry_required: boolean;
  min_threshold: number;
  active: boolean;
}

export interface StockSnapshot {
  id: string;
  branch_id: string;
  material_id: string;
  material_name: string;
  available_quantity: number;
  reserved_quantity: number;
  reorder_level: number;
  nearest_expiry_date: string | null;
}

export interface RequestRecord {
  id: string;
  branch_id: string;
  client_id: string;
  client_name: string;
  request_number: string;
  status: RequestStatus;
  requested_at: string;
  needed_by: string | null;
  total_items: number;
  total_requested_quantity: number;
  notes?: string | null;
}

export interface ApprovalQueueItem {
  id: string;
  request_number: string;
  branch_name: string;
  client_name: string;
  submitted_by: string;
  pending_items: number;
  decision: ApprovalDecision;
  submitted_at: string;
  partial_reason: string | null;
}

export interface DispatchRecord {
  id: string;
  dispatch_number: string;
  request_number: string;
  client_name: string;
  branch_name: string;
  status: DispatchStatus;
  courier_name: string | null;
  tracking_number: string | null;
  dispatched_at: string | null;
  eta_date: string | null;
}

export interface NotificationRecord {
  id: string;
  title: string;
  body: string;
  kind: "internal" | "client_email";
  created_at: string;
  read_at: string | null;
  route: string | null;
}

export interface DashboardMetrics {
  activeClients: number;
  pendingRequests: number;
  pendingApprovals: number;
  dispatchesInFlight: number;
  expiringSoon: number;
  lowStockMaterials: number;
  deliveriesToday: number;
}

export interface DashboardData {
  metrics: DashboardMetrics;
  requestQueue: RequestRecord[];
  approvalQueue: ApprovalQueueItem[];
  lowStock: StockSnapshot[];
  expiringStock: StockSnapshot[];
  dispatches: DispatchRecord[];
  notifications: NotificationRecord[];
}
