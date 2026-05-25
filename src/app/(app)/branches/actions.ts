"use server";

import { revalidatePath } from "next/cache";

import { canAccessBranch, requireAuthorizedActor } from "@/app/(app)/action-utils";
import { writeAuditLog } from "@/lib/insforge/server";
import { branchSchema, type BranchFormValues } from "@/lib/validators/branch";
import type { Branch } from "@/types/domain";

type BranchActionResult =
  | { ok: true; branch: Branch }
  | { ok: false; error: string };

type BranchMutationResult =
  | { ok: true }
  | { ok: false; error: string };

function mapBranchRow(data: Record<string, unknown>) {
  return {
    id: String(data.id),
    name: String(data.name),
    code: String(data.code),
    address: (data.address as string | null | undefined) ?? null,
    city: String(data.city ?? ""),
    state: (data.state as string | null | undefined) ?? null,
    pincode: (data.pincode as string | null | undefined) ?? null,
    contact_person: (data.contact_person as string | null | undefined) ?? null,
    contact_number: (data.contact_number as string | null | undefined) ?? null,
    is_active: Boolean(data.is_active),
    deleted_at: (data.deleted_at as string | null | undefined) ?? null,
  } satisfies Branch;
}

export async function saveBranchAction(values: BranchFormValues): Promise<BranchActionResult> {
  try {
    const { authContext, actor } = await requireAuthorizedActor(["superadmin", "admin"]);
    const parsed = branchSchema.safeParse(values);

    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Please review the branch details.",
      };
    }

    let existingBranch: Record<string, unknown> | null = null;

    if (parsed.data.id) {
      const existingResponse = await authContext.insforge.database
        .from("branches")
        .select("id, name, code, address, city, state, pincode, contact_person, contact_number, is_active, deleted_at")
        .eq("id", parsed.data.id)
        .single();

      if (existingResponse.error || !existingResponse.data) {
        return {
          ok: false,
          error: existingResponse.error?.message ?? "Branch not found.",
        };
      }

      existingBranch = existingResponse.data as Record<string, unknown>;

      if (actor.role !== "superadmin" && !canAccessBranch(actor, parsed.data.id)) {
        return {
          ok: false,
          error: "You can manage only your assigned branches.",
        };
      }
    }

    const payload = {
      name: parsed.data.name.trim(),
      code: parsed.data.code.trim().toUpperCase(),
      address: parsed.data.address?.trim() || null,
      city: parsed.data.city.trim(),
      state: parsed.data.state?.trim() || null,
      pincode: parsed.data.pincode?.trim() || null,
      contact_person: parsed.data.contact_person?.trim() || null,
      contact_number: parsed.data.contact_number?.trim() || null,
      is_active: parsed.data.status === "active",
      deleted_at: null,
      deleted_by: null,
    };

    const response = parsed.data.id
      ? await authContext.insforge.database
          .from("branches")
          .update(payload)
          .eq("id", parsed.data.id)
          .select("id, name, code, address, city, state, pincode, contact_person, contact_number, is_active, deleted_at")
          .single()
      : await authContext.insforge.database
          .from("branches")
          .insert(payload)
          .select("id, name, code, address, city, state, pincode, contact_person, contact_number, is_active, deleted_at")
          .single();

    if (response.error || !response.data) {
      return {
        ok: false,
        error: response.error?.message ?? "Unable to save the branch.",
      };
    }

    const branch = mapBranchRow(response.data as Record<string, unknown>);

    await writeAuditLog(authContext.insforge, {
      actor_user_id: actor.id,
      subject_user_id: null,
      action: parsed.data.id ? "branch.updated" : "branch.created",
      module_name: "branches",
      record_id: branch.id,
      old_value: existingBranch,
      new_value: response.data as Record<string, unknown>,
      user_role: actor.role,
      details: {
        branch_id: branch.id,
        branch_code: branch.code,
      },
    });

    revalidatePath("/branches");
    revalidatePath("/dashboard");

    return { ok: true, branch };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to save the branch.",
    };
  }
}

export async function toggleBranchStatusAction(
  branchId: string,
  nextActive: boolean,
): Promise<BranchMutationResult> {
  try {
    const { authContext, actor } = await requireAuthorizedActor(["superadmin", "admin"]);

    const existingResponse = await authContext.insforge.database
      .from("branches")
      .select("id, name, code, is_active")
      .eq("id", branchId)
      .single();

    if (existingResponse.error || !existingResponse.data) {
      return {
        ok: false,
        error: existingResponse.error?.message ?? "Branch not found.",
      };
    }

    if (actor.role !== "superadmin" && !canAccessBranch(actor, branchId)) {
      return {
        ok: false,
        error: "You can manage only your assigned branches.",
      };
    }

    const updateResponse = await authContext.insforge.database
      .from("branches")
      .update({ is_active: nextActive })
      .eq("id", branchId);

    if (updateResponse.error) {
      return {
        ok: false,
        error: updateResponse.error.message,
      };
    }

    await writeAuditLog(authContext.insforge, {
      actor_user_id: actor.id,
      subject_user_id: null,
      action: nextActive ? "branch.activated" : "branch.deactivated",
      module_name: "branches",
      record_id: branchId,
      old_value: existingResponse.data as Record<string, unknown>,
      new_value: {
        ...(existingResponse.data as Record<string, unknown>),
        is_active: nextActive,
      },
      user_role: actor.role,
      details: { branch_id: branchId },
    });

    revalidatePath("/branches");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to update branch status.",
    };
  }
}

export async function deleteBranchAction(branchId: string): Promise<BranchMutationResult> {
  try {
    const { authContext, actor } = await requireAuthorizedActor(["superadmin"]);

    const existingResponse = await authContext.insforge.database
      .from("branches")
      .select("id, name, code, is_active, deleted_at")
      .eq("id", branchId)
      .single();

    if (existingResponse.error || !existingResponse.data) {
      return {
        ok: false,
        error: existingResponse.error?.message ?? "Branch not found.",
      };
    }

    const updateResponse = await authContext.insforge.database
      .from("branches")
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: actor.id,
        is_active: false,
      })
      .eq("id", branchId);

    if (updateResponse.error) {
      return {
        ok: false,
        error: updateResponse.error.message,
      };
    }

    await writeAuditLog(authContext.insforge, {
      actor_user_id: actor.id,
      subject_user_id: null,
      action: "branch.deleted",
      module_name: "branches",
      record_id: branchId,
      old_value: existingResponse.data as Record<string, unknown>,
      new_value: {
        ...(existingResponse.data as Record<string, unknown>),
        deleted_at: new Date().toISOString(),
      },
      user_role: actor.role,
      details: { branch_id: branchId },
    });

    revalidatePath("/branches");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to delete the branch.",
    };
  }
}
