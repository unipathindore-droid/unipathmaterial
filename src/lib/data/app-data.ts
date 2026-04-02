import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  ApprovalQueueItem,
  Branch,
  Client,
  DashboardData,
  DispatchRecord,
  Material,
  NotificationRecord,
  RequestRecord,
  StockSnapshot,
  UserProfile,
} from "@/types/domain";

async function getServerSupabase() {
  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    throw new Error("Supabase environment variables are not configured.");
  }

  return supabase;
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

export async function getDashboardData(): Promise<DashboardData> {
  const supabase = await getServerSupabase();

  const [clients, requests, approvals, stock, dispatches, notifications] = await Promise.all([
    supabase.from("clients").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("request_summary").select("*").order("requested_at", { ascending: false }).limit(5),
    supabase.from("approval_queue").select("*").order("submitted_at", { ascending: false }).limit(4),
    supabase
      .from("inventory_overview")
      .select("*")
      .or(
        `available_quantity.lte.reorder_level,nearest_expiry_date.lte.${new Date(Date.now() + 7 * 86400000)
          .toISOString()
          .slice(0, 10)}`,
      )
      .limit(6),
    supabase.from("dispatch_overview").select("*").order("created_at", { ascending: false }).limit(5),
    supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(6),
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
      dispatchesInFlight: dispatchRows.filter((item) => item.status !== "delivered").length,
      expiringSoon: inventoryRows.filter((item) => item.nearest_expiry_date).length,
      lowStockMaterials: inventoryRows.filter(
        (item) => item.available_quantity <= item.reorder_level,
      ).length,
      deliveriesToday: dispatchRows.filter((item) => item.status === "delivered").length,
    },
    requestQueue: requestRows,
    approvalQueue: (approvals.data ?? []) as ApprovalQueueItem[],
    lowStock: inventoryRows.filter((item) => item.available_quantity <= item.reorder_level),
    expiringStock: inventoryRows.filter((item) => item.nearest_expiry_date),
    dispatches: dispatchRows,
    notifications: (notifications.data ?? []) as NotificationRecord[],
  };
}

export async function getClients(): Promise<Client[]> {
  const supabase = await getServerSupabase();
  const { data } = await supabase
    .from("clients")
    .select("id, branch_id, client_code, name, email, phone, city, address, status")
    .order("name");
  return (data ?? []) as Client[];
}

export async function getBranches(): Promise<Branch[]> {
  const supabase = await getServerSupabase();
  const { data } = await supabase
    .from("branches")
    .select("id, name, code, city, state")
    .eq("is_active", true)
    .order("name");
  return (data ?? []) as Branch[];
}

export async function getMaterials(): Promise<Material[]> {
  const supabase = await getServerSupabase();
  const { data } = await supabase
    .from("materials")
    .select(
      "id, sku, name, category, unit_of_measure, expiry_required:requires_expiry_before_dispatch, min_threshold:reorder_level, active",
    )
    .order("name");
  return (data ?? []) as Material[];
}

export async function getRequests(): Promise<RequestRecord[]> {
  const supabase = await getServerSupabase();
  const { data } = await supabase.from("request_summary").select("*").order("requested_at", {
    ascending: false,
  });
  return (data ?? []) as RequestRecord[];
}

export async function getApprovalQueue(): Promise<ApprovalQueueItem[]> {
  const supabase = await getServerSupabase();
  const { data } = await supabase
    .from("approval_queue")
    .select("*")
    .order("submitted_at", { ascending: false });
  return (data ?? []) as ApprovalQueueItem[];
}

export async function getDispatches(): Promise<DispatchRecord[]> {
  const supabase = await getServerSupabase();
  const { data } = await supabase.from("dispatch_overview").select("*").order("created_at", {
    ascending: false,
  });
  return (data ?? []) as DispatchRecord[];
}

export async function getDispatchEmailEvents(): Promise<NotificationRecord[]> {
  const supabase = await getServerSupabase();
  const { data } = await supabase
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
  const supabase = await getServerSupabase();
  const [stock, notifications] = await Promise.all([
    supabase.from("inventory_overview").select("*").order("available_quantity"),
    supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(6),
  ]);

  return {
    stock: (stock.data ?? []) as StockSnapshot[],
    notifications: (notifications.data ?? []) as NotificationRecord[],
  };
}

export async function getNotifications(profile: UserProfile | null): Promise<NotificationRecord[]> {
  if (!profile) {
    return [];
  }

  const supabase = await getServerSupabase();
  let query = supabase
    .from("notifications")
    .select("id, title, body, kind, created_at, read_at, route")
    .order("created_at", { ascending: false })
    .limit(12);

  if (profile.role !== "admin") {
    query = query.eq("recipient_user_id", profile.id);
  }

  const { data } = await query;
  return (data ?? []) as NotificationRecord[];
}
