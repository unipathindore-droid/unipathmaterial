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

export type DispatchStatus = "queued" | "packed" | "dispatched" | "delivered" | "cancelled";

export type DeliveryStatus = "pending" | "in_transit" | "delivered" | "issue";

export type DispatchTransportType = "person" | "bus" | "courier";

export interface UserPermissionSet {
  view_materials?: boolean;
  manage_materials?: boolean;
  view_dispatch?: boolean;
  manage_dispatch?: boolean;
  manage_stock?: boolean;
  view_reports?: boolean;
  create_requests?: boolean;
  manage_clients?: boolean;
}

export interface Branch {
  id: string;
  name: string;
  code: string;
  address?: string | null;
  city: string;
  state?: string | null;
  pincode?: string | null;
  contact_person?: string | null;
  contact_number?: string | null;
  is_active?: boolean;
  deleted_at?: string | null;
}

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  mobile_number?: string | null;
  role: AppRole;
  branch_id: string | null;
  managed_branch_ids?: string[];
  permissions?: UserPermissionSet;
  is_active?: boolean;
  approval_status?: ApprovalStatus;
  invited_by?: string | null;
  created_by?: string | null;
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
  module_name?: string | null;
  record_id?: string | null;
  old_value?: Record<string, unknown> | null;
  new_value?: Record<string, unknown> | null;
  user_role?: string | null;
  ip_address?: string | null;
  device_info?: string | null;
  details: Record<string, unknown>;
  created_at: string;
  actor_name?: string;
  subject_name?: string;
}

export interface AdminConsoleMetrics {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
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
  material_code?: string;
  name: string;
  category: string;
  unit_of_measure: string;
  expiry_required: boolean;
  min_threshold: number;
  active: boolean;
  created_by?: string | null;
  updated_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface StockSnapshot {
  id: string;
  branch_id: string;
  branch_name?: string;
  material_id: string;
  material_name: string;
  material_code?: string;
  opening_stock?: number;
  available_quantity: number;
  reserved_quantity: number;
  reorder_level: number;
  status?: "active" | "inactive";
  nearest_expiry_date: string | null;
  created_by_name?: string | null;
  updated_by_name?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface MonthlyStockUpdateRecord {
  id: string;
  branch_id: string;
  branch_name?: string;
  material_id: string;
  material_name?: string;
  material_code?: string;
  month: string;
  opening_stock: number;
  received_stock: number;
  used_stock: number;
  damaged_stock: number;
  closing_stock: number;
  remarks?: string | null;
  created_by_name?: string | null;
  updated_by_name?: string | null;
  created_at?: string;
  updated_at?: string;
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
  dispatch_date?: string | null;
  dispatch_from_branch_name?: string | null;
  dispatch_to_branch_name?: string | null;
  destination_name?: string | null;
  dispatch_type?: DispatchTransportType | null;
  person_name?: string | null;
  bus_name?: string | null;
  bus_number?: string | null;
  courier_company_name?: string | null;
  courier_name: string | null;
  tracking_number: string | null;
  lr_number?: string | null;
  contact_number?: string | null;
  remarks?: string | null;
  received_confirmation?: boolean;
  received_by?: string | null;
  received_date?: string | null;
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

export interface ExcelActivityRecord {
  id: string;
  module_name: string;
  operation: "upload" | "export";
  file_name?: string | null;
  branch_name?: string | null;
  row_count: number;
  created_by_name?: string | null;
  created_at: string;
}

export interface DeletedMaterialLogRecord {
  id: string;
  material_id?: string | null;
  material_snapshot: Record<string, unknown>;
  deleted_by_name?: string | null;
  deleted_at: string;
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
