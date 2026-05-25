import { getAuthenticatedServerClient } from "@/lib/insforge/server";
import type {
  AdminConsoleData,
  ApprovalQueueItem,
  AuditLogRecord,
  Branch,
  Client,
  DashboardData,
  DeletedMaterialLogRecord,
  DispatchRecord,
  ExcelActivityRecord,
  ManagedUserRecord,
  Material,
  MonthlyStockUpdateRecord,
  NotificationRecord,
  RequestRecord,
  StockSnapshot,
  UserProfile,
} from "@/types/domain";

async function getServerInsForge() {
  const authContext = await getAuthenticatedServerClient();

  if (!authContext) {
    throw new Error("InsForge authentication is unavailable.");
  }

  return authContext.insforge;
}

function mapEmailEventToNotification(
  event: {
    id: string;
    event_type: "dispatch_notice" | "expiry_warning";
    recipient_email: string;
    created_at: string;
    sent_at?: string | null;
  },
): NotificationRecord {
  const title =
    event.event_type === "dispatch_notice" ? "Dispatch email queued" : "Expiry warning email queued";

  return {
    id: event.id,
    title,
    body: `${title} for ${event.recipient_email}.`,
    kind: "client_email",
    created_at: event.created_at,
    read_at: event.sent_at ?? null,
    route: "/dispatch",
  };
}

function getManagedBranches(profile: UserProfile) {
  const managed = profile.managed_branch_ids ?? [];
  return managed.length ? managed : profile.branch_id ? [profile.branch_id] : [];
}

function isBranchScopedProfile(profile: UserProfile) {
  if (profile.role === "superadmin") {
    return false;
  }

  if (profile.role === "admin") {
    return getManagedBranches(profile).length > 0;
  }

  return Boolean(profile.branch_id);
}

function applyBranchFilter<T>(query: T, profile: UserProfile, column = "branch_id") {
  if (!isBranchScopedProfile(profile)) {
    return query;
  }

  const managedBranches = getManagedBranches(profile);

  if (!managedBranches.length) {
    return query;
  }

  const typedQuery = query as {
    eq?: (filterColumn: string, value: string) => T;
    in?: (filterColumn: string, values: string[]) => T;
  };

  if (managedBranches.length === 1 && typedQuery.eq) {
    return typedQuery.eq(column, managedBranches[0]);
  }

  if (typedQuery.in) {
    return typedQuery.in(column, managedBranches);
  }

  return query;
}

export async function getDashboardData(profile: UserProfile): Promise<DashboardData> {
  const emptyDashboard: DashboardData = {
    metrics: {
      activeClients: 0,
      pendingRequests: 0,
      pendingApprovals: 0,
      dispatchesInFlight: 0,
      expiringSoon: 0,
      lowStockMaterials: 0,
      deliveriesToday: 0,
    },
    requestQueue: [],
    approvalQueue: [],
    lowStock: [],
    expiringStock: [],
    dispatches: [],
    notifications: [],
  };

  try {
    const insforge = await getServerInsForge();
    const expiryCutoff = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

    const clientCountQuery = applyBranchFilter(
      insforge.database.from("clients").select("id", { count: "exact", head: true }).eq("status", "active"),
      profile,
    );

    const requestsQuery = applyBranchFilter(
      insforge.database.from("request_summary").select("*").order("requested_at", { ascending: false }).limit(5),
      profile,
    );

    const approvalsQuery = applyBranchFilter(
      insforge.database.from("approval_queue").select("*").order("submitted_at", { ascending: false }).limit(4),
      profile,
    );

    const stockQuery = applyBranchFilter(
      insforge.database
        .from("inventory_overview")
        .select("*")
        .or(`available_quantity.lte.reorder_level,nearest_expiry_date.lte.${expiryCutoff}`)
        .limit(6),
      profile,
    );

    const dispatchQuery = applyBranchFilter(
      insforge.database.from("dispatch_overview").select("*").order("created_at", { ascending: false }).limit(5),
      profile,
    );

    const notificationQuery =
      profile.role === "admin" || profile.role === "superadmin"
        ? insforge.database.from("notifications").select("*").order("created_at", { ascending: false }).limit(6)
        : insforge.database
            .from("notifications")
            .select("*")
            .eq("recipient_user_id", profile.id)
            .order("created_at", { ascending: false })
            .limit(6);

    const [clients, requests, approvals, stock, dispatches, notifications] = await Promise.all([
      clientCountQuery,
      requestsQuery,
      approvalsQuery,
      stockQuery,
      dispatchQuery,
      notificationQuery,
    ]);

    const inventoryRows = (stock.data ?? []) as StockSnapshot[];
    const requestRows = (requests.data ?? []) as RequestRecord[];
    const dispatchRows = (dispatches.data ?? []) as DispatchRecord[];

    return {
      metrics: {
        activeClients: clients.count ?? 0,
        pendingRequests: requestRows.filter((item) =>
          ["draft", "pending", "submitted", "partially_approved", "approved"].includes(item.status),
        ).length,
        pendingApprovals: ((approvals.data ?? []) as ApprovalQueueItem[]).filter(
          (item) => item.decision === "pending",
        ).length,
        dispatchesInFlight: dispatchRows.filter((item) => item.status !== "delivered").length,
        expiringSoon: inventoryRows.filter((item) => item.nearest_expiry_date).length,
        lowStockMaterials: inventoryRows.filter((item) => item.available_quantity <= item.reorder_level).length,
        deliveriesToday: dispatchRows.filter((item) => item.status === "delivered").length,
      },
      requestQueue: requestRows,
      approvalQueue: (approvals.data ?? []) as ApprovalQueueItem[],
      lowStock: inventoryRows.filter((item) => item.available_quantity <= item.reorder_level),
      expiringStock: inventoryRows.filter((item) => item.nearest_expiry_date),
      dispatches: dispatchRows,
      notifications: (notifications.data ?? []) as NotificationRecord[],
    };
  } catch {
    return emptyDashboard;
  }
}

export async function getClients(profile?: UserProfile | null): Promise<Client[]> {
  const insforge = await getServerInsForge();
  let query = insforge.database
    .from("clients")
    .select("id, branch_id, client_code, name, email, phone, contact_person, city, state, address, status")
    .order("name");

  if (profile) {
    query = applyBranchFilter(query, profile);
  }

  const { data } = await query;
  return (data ?? []) as Client[];
}

export async function getBranches(
  profile?: UserProfile | null,
  includeInactive = true,
): Promise<Branch[]> {
  const insforge = await getServerInsForge();
  let query = insforge.database
    .from("branches")
    .select("id, name, code, address, city, state, pincode, contact_person, contact_number, is_active, deleted_at")
    .is("deleted_at", null)
    .order("name");

  if (profile) {
    query = applyBranchFilter(query, profile, "id");
  }

  if (!includeInactive) {
    query = query.eq("is_active", true);
  }

  const { data } = await query;
  return (data ?? []) as Branch[];
}

export async function getMaterials(): Promise<Material[]> {
  const insforge = await getServerInsForge();
  const { data } = await insforge.database
    .from("materials")
    .select(
      "id, sku, material_code, name, category, unit_of_measure, expiry_required:requires_expiry_before_dispatch, min_threshold:reorder_level, active, created_by, updated_by, created_at, updated_at",
    )
    .is("deleted_at", null)
    .order("name");
  return (data ?? []) as Material[];
}

export async function getMaterialStockRows(profile?: UserProfile | null): Promise<StockSnapshot[]> {
  const insforge = await getServerInsForge();
  let query = insforge.database
    .from("branch_material_stock_report")
    .select("*")
    .order("branch_name")
    .order("material_name");

  if (profile) {
    query = applyBranchFilter(query, profile);
  }

  const { data } = await query;
  return (data ?? []) as StockSnapshot[];
}

export async function getRequests(profile?: UserProfile | null): Promise<RequestRecord[]> {
  const insforge = await getServerInsForge();
  let query = insforge.database
    .from("request_summary")
    .select("*")
    .order("requested_at", { ascending: false });

  if (profile) {
    query = applyBranchFilter(query, profile);
  }

  const { data } = await query;
  return (data ?? []) as RequestRecord[];
}

export async function getApprovalQueue(): Promise<ApprovalQueueItem[]> {
  const insforge = await getServerInsForge();
  const { data } = await insforge.database
    .from("approval_queue")
    .select("*")
    .order("submitted_at", { ascending: false });
  return (data ?? []) as ApprovalQueueItem[];
}

export async function getDispatches(profile?: UserProfile | null): Promise<DispatchRecord[]> {
  const insforge = await getServerInsForge();
  let query = insforge.database
    .from("dispatch_report")
    .select("*")
    .order("dispatch_date", { ascending: false });

  if (profile) {
    query = applyBranchFilter(query, profile);
  }

  const { data } = await query;
  return (data ?? []) as DispatchRecord[];
}

export async function getDispatchEmailEvents(): Promise<NotificationRecord[]> {
  const insforge = await getServerInsForge();
  const { data } = await insforge.database
    .from("email_events")
    .select("id, event_type, recipient_email, created_at, sent_at")
    .order("created_at", { ascending: false })
    .limit(10);

  return ((data ?? []) as Array<{
    id: string;
    event_type: "dispatch_notice" | "expiry_warning";
    recipient_email: string;
    created_at: string;
    sent_at?: string | null;
  }>).map(mapEmailEventToNotification);
}

export async function getInventorySignals(): Promise<{
  stock: StockSnapshot[];
  notifications: NotificationRecord[];
}> {
  const insforge = await getServerInsForge();
  const [stock, notifications] = await Promise.all([
    insforge.database.from("inventory_overview").select("*").order("available_quantity"),
    insforge.database.from("notifications").select("*").order("created_at", { ascending: false }).limit(6),
  ]);

  return {
    stock: (stock.data ?? []) as StockSnapshot[],
    notifications: (notifications.data ?? []) as NotificationRecord[],
  };
}

export async function getMonthlyStockUpdates(profile?: UserProfile | null): Promise<MonthlyStockUpdateRecord[]> {
  const insforge = await getServerInsForge();
  let query = insforge.database
    .from("monthly_stock_report")
    .select("*")
    .order("month", { ascending: false })
    .order("branch_name");

  if (profile) {
    query = applyBranchFilter(query, profile);
  }

  const { data } = await query;
  return (data ?? []) as MonthlyStockUpdateRecord[];
}

export async function getExcelActivityLogs(): Promise<ExcelActivityRecord[]> {
  const insforge = await getServerInsForge();
  const { data } = await insforge.database
    .from("upload_history_report")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  return (data ?? []) as ExcelActivityRecord[];
}

export async function getDeletedMaterialLogs(): Promise<DeletedMaterialLogRecord[]> {
  const insforge = await getServerInsForge();
  const { data } = await insforge.database
    .from("deleted_material_report")
    .select("*")
    .order("deleted_at", { ascending: false })
    .limit(50);
  return (data ?? []) as DeletedMaterialLogRecord[];
}

export async function getNotifications(profile: UserProfile | null): Promise<NotificationRecord[]> {
  if (!profile) {
    return [];
  }

  const insforge = await getServerInsForge();
  let query = insforge.database
    .from("notifications")
    .select("id, title, body, kind, created_at, read_at, route")
    .order("created_at", { ascending: false })
    .limit(12);

  if (profile.role !== "admin" && profile.role !== "superadmin") {
    query = query.eq("recipient_user_id", profile.id);
  }

  const { data } = await query;
  return (data ?? []) as NotificationRecord[];
}

export async function getAdminConsoleData(profile: UserProfile): Promise<AdminConsoleData> {
  try {
    const insforge = await getServerInsForge();

    let usersQuery = insforge.database
      .from("profiles")
      .select(
        "id, full_name, email, mobile_number, role, branch_id, managed_branch_ids, permissions, is_active, approval_status, invited_by, approved_by, approved_at, email_verified_at, last_login_at, created_at",
      )
      .order("created_at", { ascending: false });

    let auditQuery = insforge.database
      .from("audit_logs")
      .select("id, actor_user_id, subject_user_id, action, module_name, record_id, old_value, new_value, user_role, ip_address, device_info, details, created_at")
      .order("created_at", { ascending: false })
      .limit(20);

    if (profile.role !== "superadmin") {
      usersQuery = usersQuery.neq("role", "superadmin");
      auditQuery = auditQuery.or(`actor_user_id.eq.${profile.id},subject_user_id.eq.${profile.id}`);
    }

    const [usersResponse, auditResponse] = await Promise.all([usersQuery, auditQuery]);
    const users = (usersResponse.data ?? []) as ManagedUserRecord[];
    const nameMap = new Map(users.map((user) => [user.id, user.full_name]));
    const recentAuditLogs = ((auditResponse.data ?? []) as AuditLogRecord[]).map((item) => ({
      ...item,
      actor_name: item.actor_user_id ? nameMap.get(item.actor_user_id) ?? "System" : "System",
      subject_name: item.subject_user_id ? nameMap.get(item.subject_user_id) ?? "User" : "User",
    }));

    return {
      metrics: {
        totalUsers: users.length,
        pendingApprovals: users.filter((user) => user.approval_status === "pending").length,
        approvedUsers: users.filter((user) => user.approval_status === "approved" && user.is_active).length,
        auditEvents: recentAuditLogs.length,
      },
      users,
      pendingUsers: users.filter((user) => user.approval_status === "pending"),
      recentAuditLogs,
    };
  } catch {
    return {
      metrics: {
        totalUsers: 0,
        pendingApprovals: 0,
        approvedUsers: 0,
        auditEvents: 0,
      },
      users: [],
      pendingUsers: [],
      recentAuditLogs: [],
    };
  }
}
