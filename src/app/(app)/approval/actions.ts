"use server";

import { revalidatePath } from "next/cache";

import { canAccessBranch, requireAuthorizedActor } from "@/app/(app)/action-utils";
import { writeAuditLog } from "@/lib/insforge/server";
import { approvalSchema } from "@/lib/validators/approval";

type ApprovalActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function applyApprovalDecisionAction(input: {
  requestId: string;
  decision: "approved" | "rejected" | "partially_approved";
  reason: string;
}): Promise<ApprovalActionResult> {
  try {
    const { authContext, actor } = await requireAuthorizedActor([
      "superadmin",
      "admin",
      "material_team",
    ]);

    const parsed = approvalSchema.safeParse({
      decision: input.decision,
      reason: input.reason,
    });

    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Please review the approval input.",
      };
    }

    const { data: requestRow, error: requestError } = await authContext.insforge.database
      .from("material_requests")
      .select("id, branch_id, client_id, request_number")
      .eq("id", input.requestId)
      .single();

    if (requestError || !requestRow) {
      return {
        ok: false,
        error: requestError?.message ?? "Request could not be found.",
      };
    }

    if (!canAccessBranch(actor, requestRow.branch_id)) {
      return {
        ok: false,
        error: "You can only approve requests for your own branch.",
      };
    }

    const itemsResponse = await authContext.insforge.database
      .from("material_request_items")
      .select("id, requested_quantity")
      .eq("request_id", requestRow.id);

    if (itemsResponse.error) {
      return {
        ok: false,
        error: itemsResponse.error.message,
      };
    }

    const itemUpdates = ((itemsResponse.data ?? []) as Array<{
      id: string;
      requested_quantity: number;
    }>).map((item) => ({
      id: item.id,
      decision: parsed.data.decision,
      approved_quantity:
        parsed.data.decision === "approved"
          ? item.requested_quantity
          : parsed.data.decision === "partially_approved"
            ? Math.max(item.requested_quantity - 1, 0)
            : 0,
      approval_reason: parsed.data.reason?.trim() || null,
    }));

    for (const itemUpdate of itemUpdates) {
      const itemResult = await authContext.insforge.database
        .from("material_request_items")
        .update({
          decision: itemUpdate.decision,
          approved_quantity: itemUpdate.approved_quantity,
          approval_reason: itemUpdate.approval_reason,
        })
        .eq("id", itemUpdate.id);

      if (itemResult.error) {
        return {
          ok: false,
          error: itemResult.error.message,
        };
      }
    }

    const nextStatus =
      parsed.data.decision === "approved"
        ? "approved"
        : parsed.data.decision === "rejected"
          ? "rejected"
          : "partially_approved";

    const statusUpdate = await authContext.insforge.database
      .from("material_requests")
      .update({ status: nextStatus })
      .eq("id", requestRow.id);

    if (statusUpdate.error) {
      return {
        ok: false,
        error: statusUpdate.error.message,
      };
    }

    await authContext.insforge.database.from("notifications").insert({
      branch_id: requestRow.branch_id,
      recipient_user_id: null,
      title: `Request ${requestRow.request_number} ${parsed.data.decision.replaceAll("_", " ")}`,
      body:
        parsed.data.decision === "approved"
          ? `The request has been approved.`
          : parsed.data.decision === "rejected"
            ? `The request was rejected. Reason: ${parsed.data.reason}`
            : `The request was partially approved. Reason: ${parsed.data.reason}`,
      kind: "internal",
      route: "/approval",
    });

    await writeAuditLog(authContext.insforge, {
      actor_user_id: actor.id,
      subject_user_id: null,
      action: `request.${nextStatus}`,
      details: {
        request_id: requestRow.id,
        request_number: requestRow.request_number,
        decision: parsed.data.decision,
      },
    });

    revalidatePath("/approval");
    revalidatePath("/requests");
    revalidatePath("/dashboard");

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to save the approval decision.",
    };
  }
}
