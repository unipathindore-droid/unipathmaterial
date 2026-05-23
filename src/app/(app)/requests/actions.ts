"use server";

import { revalidatePath } from "next/cache";

import { canAccessBranch, requireAuthorizedActor } from "@/app/(app)/action-utils";
import { writeAuditLog } from "@/lib/insforge/server";
import { requestSchema, type RequestFormValues } from "@/lib/validators/request";
import type { RequestRecord } from "@/types/domain";

type RequestActionResult =
  | { ok: true; request: RequestRecord }
  | { ok: false; error: string };

function buildRequestNumber() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const suffix = `${now.getTime()}${Math.floor(Math.random() * 100)}`.slice(-6);
  return `REQ-${y}${m}${d}-${suffix}`;
}

export async function createRequestAction(values: RequestFormValues): Promise<RequestActionResult> {
  try {
    const { authContext, actor } = await requireAuthorizedActor([
      "superadmin",
      "admin",
      "branch_admin",
      "sales",
      "phlebotomist",
    ]);

    const parsed = requestSchema.safeParse(values);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Please review the request details.",
      };
    }

    const { data: selectedClient, error: clientError } = await authContext.insforge.database
      .from("clients")
      .select("id, branch_id, name")
      .eq("id", parsed.data.client_id)
      .single();

    if (clientError || !selectedClient) {
      return {
        ok: false,
        error: clientError?.message ?? "Selected client could not be found.",
      };
    }

    if (!canAccessBranch(actor, selectedClient.branch_id)) {
      return {
        ok: false,
        error: "Selected client is not available for your branch.",
      };
    }

    const requestNumber = buildRequestNumber();
    const requestPayload = {
      branch_id: selectedClient.branch_id,
      client_id: parsed.data.client_id,
      request_number: requestNumber,
      status: "submitted",
      requested_by: actor.id,
      needed_by: parsed.data.required_by || null,
      notes: parsed.data.notes?.trim() || null,
    };

    const requestInsert = await authContext.insforge.database
      .from("material_requests")
      .insert(requestPayload)
      .select("id, created_at")
      .single();

    if (requestInsert.error || !requestInsert.data) {
      return {
        ok: false,
        error: requestInsert.error?.message ?? "Unable to create the request.",
      };
    }

    const requestId = requestInsert.data.id as string;
    const itemPayload = parsed.data.items.map((item) => ({
      request_id: requestId,
      material_id: item.material_id,
      requested_quantity: item.requested_qty,
    }));

    const itemsInsert = await authContext.insforge.database
      .from("material_request_items")
      .insert(itemPayload);

    if (itemsInsert.error) {
      await authContext.insforge.database.from("material_requests").delete().eq("id", requestId);
      return {
        ok: false,
        error: itemsInsert.error.message,
      };
    }

    await authContext.insforge.database.from("notifications").insert({
      branch_id: selectedClient.branch_id,
      recipient_user_id: null,
      title: `New request ${requestNumber} created`,
      body: `${selectedClient.name} submitted a request with ${itemPayload.length} material line items.`,
      kind: "internal",
      route: "/requests",
    });

    await writeAuditLog(authContext.insforge, {
      actor_user_id: actor.id,
      subject_user_id: null,
      action: "request.created",
      details: {
        request_id: requestId,
        request_number: requestNumber,
        client_id: selectedClient.id,
        item_count: itemPayload.length,
      },
    });

    revalidatePath("/requests");
    revalidatePath("/approval");
    revalidatePath("/dashboard");

    return {
      ok: true,
      request: {
        id: requestId,
        branch_id: selectedClient.branch_id,
        client_id: selectedClient.id,
        client_name: selectedClient.name,
        request_number: requestNumber,
        status: "submitted",
        requested_at: requestInsert.data.created_at ?? new Date().toISOString(),
        needed_by: requestPayload.needed_by,
        notes: requestPayload.notes,
        total_items: itemPayload.length,
        total_requested_quantity: itemPayload.reduce(
          (sum, item) => sum + Number(item.requested_quantity),
          0,
        ),
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to create the request.",
    };
  }
}
