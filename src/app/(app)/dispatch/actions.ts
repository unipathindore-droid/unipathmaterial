"use server";

import { revalidatePath } from "next/cache";

import { canAccessBranch, requireAuthorizedActor } from "@/app/(app)/action-utils";
import { writeAuditLog } from "@/lib/insforge/server";
import { dispatchSchema, type DispatchFormValues } from "@/lib/validators/dispatch";

type DispatchDraftItem = DispatchFormValues["items"][number];

type DispatchDraftResult =
  | { ok: true; items: DispatchDraftItem[] }
  | { ok: false; error: string };

type DispatchActionResult =
  | { ok: true }
  | { ok: false; error: string };

function buildDispatchNumber() {
  const now = new Date();
  const suffix = `${now.getTime()}${Math.floor(Math.random() * 100)}`.slice(-6);
  return `DSP-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
    now.getDate(),
  ).padStart(2, "0")}-${suffix}`;
}

export async function getDispatchDraftAction(requestId: string): Promise<DispatchDraftResult> {
  try {
    const { authContext, actor } = await requireAuthorizedActor([
      "superadmin",
      "admin",
      "dispatch_manager",
    ]);

    if (!requestId) {
      return { ok: true, items: [] };
    }

    const { data: requestRow, error: requestError } = await authContext.insforge.database
      .from("material_requests")
      .select("id, branch_id, status")
      .eq("id", requestId)
      .single();

    if (requestError || !requestRow) {
      return {
        ok: false,
        error: requestError?.message ?? "Request details could not be loaded.",
      };
    }

    if (!canAccessBranch(actor, requestRow.branch_id)) {
      return {
        ok: false,
        error: "You can only dispatch requests for your own branch.",
      };
    }

    if (requestRow.status !== "approved") {
      return {
        ok: false,
        error: "Only approved requests can be prepared for dispatch.",
      };
    }

    const itemsResponse = await authContext.insforge.database
      .from("material_request_items")
      .select("id, material_id, approved_quantity")
      .eq("request_id", requestId);

    if (itemsResponse.error) {
      return {
        ok: false,
        error: itemsResponse.error.message,
      };
    }

    const itemRows = (itemsResponse.data ?? []) as Array<{
      id: string;
      material_id: string;
      approved_quantity: number | null;
    }>;

    const materialIds = itemRows.map((item) => item.material_id);
    const [materialsResponse, inventoryResponse] = await Promise.all([
      authContext.insforge.database
        .from("materials")
        .select("id, name, requires_expiry_before_dispatch")
        .in("id", materialIds),
      authContext.insforge.database
        .from("branch_inventory")
        .select("id, material_id")
        .eq("branch_id", requestRow.branch_id)
        .in("material_id", materialIds),
    ]);

    if (materialsResponse.error) {
      return {
        ok: false,
        error: materialsResponse.error.message,
      };
    }

    if (inventoryResponse.error) {
      return {
        ok: false,
        error: inventoryResponse.error.message,
      };
    }

    const materialMap = new Map(
      ((materialsResponse.data ?? []) as Array<{
        id: string;
        name: string;
        requires_expiry_before_dispatch: boolean;
      }>).map((material) => [material.id, material]),
    );
    const inventoryMap = new Map(
      ((inventoryResponse.data ?? []) as Array<{ id: string; material_id: string }>).map(
        (inventory) => [inventory.material_id, inventory.id],
      ),
    );

    const draftItems: DispatchDraftItem[] = [];

    for (const item of itemRows) {
      const material = materialMap.get(item.material_id);
      const branchInventoryId = inventoryMap.get(item.material_id);

      if (!material || !branchInventoryId || Number(item.approved_quantity ?? 0) <= 0) {
        continue;
      }

      draftItems.push({
        request_item_id: item.id,
        material_id: item.material_id,
        branch_inventory_id: branchInventoryId,
        material_name: material.name,
        expiry_required: Boolean(material.requires_expiry_before_dispatch),
        quantity: Number(item.approved_quantity ?? 1),
        batch_number: "",
        expiry_date: "",
      });
    }

    return {
      ok: true,
      items: draftItems,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to load dispatch items.",
    };
  }
}

export async function createDispatchAction(
  values: DispatchFormValues,
): Promise<DispatchActionResult> {
  try {
    const { authContext, actor } = await requireAuthorizedActor([
      "superadmin",
      "admin",
      "dispatch_manager",
    ]);

    const parsed = dispatchSchema.safeParse(values);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Please review the dispatch details.",
      };
    }

    const { data: requestRow, error: requestError } = await authContext.insforge.database
      .from("material_requests")
      .select("id, branch_id, client_id, request_number, status")
      .eq("id", parsed.data.request_id)
      .single();

    if (requestError || !requestRow) {
      return {
        ok: false,
        error: requestError?.message ?? "Request details could not be loaded.",
      };
    }

    if (!canAccessBranch(actor, requestRow.branch_id)) {
      return {
        ok: false,
        error: "You can only dispatch requests for your own branch.",
      };
    }

    if (requestRow.status !== "approved") {
      return {
        ok: false,
        error: "Only approved requests can be dispatched.",
      };
    }

    const { data: clientRow, error: clientError } = await authContext.insforge.database
      .from("clients")
      .select("id, name, email")
      .eq("id", requestRow.client_id)
      .single();

    if (clientError || !clientRow) {
      return {
        ok: false,
        error: clientError?.message ?? "Client information is missing for this request.",
      };
    }

    const dispatchNumber = buildDispatchNumber();
    const dispatchInsert = await authContext.insforge.database
      .from("dispatches")
      .insert({
        request_id: requestRow.id,
        branch_id: requestRow.branch_id,
        client_id: requestRow.client_id,
        dispatch_number: dispatchNumber,
        status: "queued",
        prepared_by: actor.id,
        courier_name: parsed.data.courier_name || null,
        tracking_number: parsed.data.tracking_number || null,
        eta_date: parsed.data.eta_date || null,
      })
      .select("id")
      .single();

    if (dispatchInsert.error || !dispatchInsert.data) {
      return {
        ok: false,
        error: dispatchInsert.error?.message ?? "Unable to create dispatch.",
      };
    }

    const dispatchId = dispatchInsert.data.id as string;
    const itemsInsert = await authContext.insforge.database.from("dispatch_items").insert(
      parsed.data.items.map((item) => ({
        dispatch_id: dispatchId,
        request_item_id: item.request_item_id,
        material_id: item.material_id,
        branch_inventory_id: item.branch_inventory_id,
        quantity: item.quantity,
        batch_number: item.batch_number || null,
        expiry_date: item.expiry_date || null,
      })),
    );

    if (itemsInsert.error) {
      await authContext.insforge.database.from("dispatches").delete().eq("id", dispatchId);
      return {
        ok: false,
        error: itemsInsert.error.message,
      };
    }

    const requestUpdate = await authContext.insforge.database
      .from("material_requests")
      .update({ status: "dispatched" })
      .eq("id", requestRow.id);

    if (requestUpdate.error) {
      return {
        ok: false,
        error: requestUpdate.error.message,
      };
    }

    const dispatchStatusUpdate = await authContext.insforge.database
      .from("dispatches")
      .update({
        status: "dispatched",
        dispatched_by: actor.id,
        dispatched_at: new Date().toISOString(),
      })
      .eq("id", dispatchId);

    if (dispatchStatusUpdate.error) {
      return {
        ok: false,
        error: dispatchStatusUpdate.error.message,
      };
    }

    await authContext.insforge.database.from("notifications").insert({
      branch_id: requestRow.branch_id,
      recipient_user_id: null,
      title: `Dispatch ${dispatchNumber} created`,
      body: `${clientRow.name} is ready for shipment under request ${requestRow.request_number}.`,
      kind: "internal",
      route: "/dispatch",
    });

    await writeAuditLog(authContext.insforge, {
      actor_user_id: actor.id,
      subject_user_id: null,
      action: "dispatch.created",
      details: {
        dispatch_id: dispatchId,
        dispatch_number: dispatchNumber,
        request_id: requestRow.id,
      },
    });

    revalidatePath("/dispatch");
    revalidatePath("/requests");
    revalidatePath("/dashboard");

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to save the dispatch.",
    };
  }
}
