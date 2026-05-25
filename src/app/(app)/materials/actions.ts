"use server";

import { revalidatePath } from "next/cache";

import { canAccessBranch, hasPermission, requireAuthorizedActor } from "@/app/(app)/action-utils";
import { parseWorkbookRows } from "@/lib/excel";
import { writeAuditLog } from "@/lib/insforge/server";
import { materialSchema, type MaterialFormValues } from "@/lib/validators/material";
import type { Material, StockSnapshot } from "@/types/domain";

type MaterialActionResult =
  | { ok: true; material: Material }
  | { ok: false; error: string };

type MaterialMutationResult =
  | { ok: true }
  | { ok: false; error: string };

type UploadResult =
  | { ok: true; imported: number }
  | { ok: false; error: string };

function canManageMaterials(
  actor: Awaited<ReturnType<typeof requireAuthorizedActor>>["actor"],
) {
  return actor.role === "superadmin" || actor.role === "admin" || hasPermission(actor, "manage_materials");
}

async function logExcelActivity(
  insforge: Awaited<ReturnType<typeof requireAuthorizedActor>>["authContext"]["insforge"],
  payload: {
    actorId: string;
    branchId?: string | null;
    moduleName: string;
    operation: "upload" | "export";
    fileName?: string | null;
    rowCount: number;
  },
) {
  await insforge.database.from("excel_activity_logs").insert({
    branch_id: payload.branchId ?? null,
    module_name: payload.moduleName,
    operation: payload.operation,
    file_name: payload.fileName ?? null,
    row_count: payload.rowCount,
    created_by: payload.actorId,
  });
}

async function upsertBranchInventory(
  authContext: Awaited<ReturnType<typeof requireAuthorizedActor>>["authContext"],
  actorId: string,
  values: MaterialFormValues,
  materialId: string,
) {
  const existingInventory = await authContext.insforge.database
    .from("branch_inventory")
    .select("id, available_quantity, opening_stock, reorder_level, status")
    .eq("branch_id", values.branch_id)
    .eq("material_id", materialId)
    .single();

  const inventoryPayload = {
    branch_id: values.branch_id,
    material_id: materialId,
    opening_stock: values.opening_stock,
    available_quantity: values.current_stock,
    reserved_quantity: 0,
    reorder_level: values.min_threshold,
    reorder_quantity: values.min_threshold,
    status: values.active ? "active" : "inactive",
    created_by: existingInventory.data ? undefined : actorId,
    updated_by: actorId,
  };

  const inventoryResponse = existingInventory.data
    ? await authContext.insforge.database
        .from("branch_inventory")
        .update(inventoryPayload)
        .eq("id", existingInventory.data.id)
        .select("id")
        .single()
    : await authContext.insforge.database
        .from("branch_inventory")
        .insert(inventoryPayload)
        .select("id")
        .single();

  if (inventoryResponse.error) {
    throw new Error(inventoryResponse.error.message);
  }

  return inventoryResponse.data as StockSnapshot | null;
}

export async function saveMaterialAction(
  values: MaterialFormValues,
): Promise<MaterialActionResult> {
  try {
    const { authContext, actor } = await requireAuthorizedActor([
      "superadmin",
      "admin",
      "material_team",
    ]);

    if (!canManageMaterials(actor)) {
      return {
        ok: false,
        error: "You do not have permission to manage materials.",
      };
    }

    const parsed = materialSchema.safeParse(values);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Please review the material details.",
      };
    }

    if (!canAccessBranch(actor, parsed.data.branch_id)) {
      return {
        ok: false,
        error: "You can manage materials only for your assigned branches.",
      };
    }

    let previousMaterial: Record<string, unknown> | null = null;
    if (parsed.data.id) {
      const existingMaterial = await authContext.insforge.database
        .from("materials")
        .select(
          "id, sku, material_code, name, category, unit_of_measure, requires_expiry_before_dispatch, reorder_level, active",
        )
        .eq("id", parsed.data.id)
        .single();

      previousMaterial = (existingMaterial.data as Record<string, unknown> | null) ?? null;
    }

    const materialPayload = {
      sku: parsed.data.sku.trim(),
      material_code: parsed.data.material_code.trim(),
      name: parsed.data.name.trim(),
      category: parsed.data.category.trim(),
      unit_of_measure: parsed.data.unit_of_measure.trim(),
      requires_expiry_before_dispatch: parsed.data.expiry_required,
      reorder_level: parsed.data.min_threshold,
      active: parsed.data.active,
      created_by: parsed.data.id ? undefined : actor.id,
      updated_by: actor.id,
      deleted_at: null,
      deleted_by: null,
    };

    const materialResponse = parsed.data.id
      ? await authContext.insforge.database
          .from("materials")
          .update(materialPayload)
          .eq("id", parsed.data.id)
          .select(
            "id, sku, material_code, name, category, unit_of_measure, expiry_required:requires_expiry_before_dispatch, min_threshold:reorder_level, active, created_by, updated_by, created_at, updated_at",
          )
          .single()
      : await authContext.insforge.database
          .from("materials")
          .insert(materialPayload)
          .select(
            "id, sku, material_code, name, category, unit_of_measure, expiry_required:requires_expiry_before_dispatch, min_threshold:reorder_level, active, created_by, updated_by, created_at, updated_at",
          )
          .single();

    if (materialResponse.error || !materialResponse.data) {
      return {
        ok: false,
        error: materialResponse.error?.message ?? "Unable to save the material.",
      };
    }

    await upsertBranchInventory(authContext, actor.id, parsed.data, materialResponse.data.id as string);

    await writeAuditLog(authContext.insforge, {
      actor_user_id: actor.id,
      subject_user_id: null,
      action: parsed.data.id ? "material.updated" : "material.created",
      module_name: "materials",
      record_id: String(materialResponse.data.id),
      old_value: previousMaterial,
      new_value: materialResponse.data as Record<string, unknown>,
      user_role: actor.role,
      details: {
        branch_id: parsed.data.branch_id,
        material_id: materialResponse.data.id,
      },
    });

    revalidatePath("/materials");
    revalidatePath("/dashboard");

    return {
      ok: true,
      material: materialResponse.data as Material,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to save the material.",
    };
  }
}

export async function deleteMaterialAction(materialId: string): Promise<MaterialMutationResult> {
  try {
    const { authContext, actor } = await requireAuthorizedActor([
      "superadmin",
      "admin",
      "material_team",
    ]);

    if (!canManageMaterials(actor)) {
      return {
        ok: false,
        error: "You do not have permission to delete materials.",
      };
    }

    const materialResponse = await authContext.insforge.database
      .from("materials")
      .select(
        "id, sku, material_code, name, category, unit_of_measure, requires_expiry_before_dispatch, reorder_level, active",
      )
      .eq("id", materialId)
      .single();

    if (materialResponse.error || !materialResponse.data) {
      return {
        ok: false,
        error: materialResponse.error?.message ?? "Material not found.",
      };
    }

    const branchInventoryRows = await authContext.insforge.database
      .from("branch_inventory")
      .select("branch_id")
      .eq("material_id", materialId);

    const branches = (branchInventoryRows.data ?? []) as Array<{ branch_id: string }>;
    const deniedBranch = branches.find((row) => !canAccessBranch(actor, row.branch_id));
    if (deniedBranch) {
      return {
        ok: false,
        error: "You can delete only materials assigned to your managed branches.",
      };
    }

    const deletedAt = new Date().toISOString();
    const updateResponse = await authContext.insforge.database
      .from("materials")
      .update({
        active: false,
        deleted_at: deletedAt,
        deleted_by: actor.id,
        updated_by: actor.id,
      })
      .eq("id", materialId);

    if (updateResponse.error) {
      return {
        ok: false,
        error: updateResponse.error.message,
      };
    }

    await authContext.insforge.database.from("deleted_material_logs").insert({
      material_id: materialId,
      material_snapshot: materialResponse.data,
      deleted_by: actor.id,
      deleted_at: deletedAt,
    });

    await writeAuditLog(authContext.insforge, {
      actor_user_id: actor.id,
      subject_user_id: null,
      action: "material.deleted",
      module_name: "materials",
      record_id: materialId,
      old_value: materialResponse.data as Record<string, unknown>,
      new_value: { deleted_at: deletedAt, active: false },
      user_role: actor.role,
      details: { material_id: materialId },
    });

    revalidatePath("/materials");
    revalidatePath("/reports");
    revalidatePath("/dashboard");

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to delete the material.",
    };
  }
}

export async function uploadMaterialsWorkbookAction(formData: FormData): Promise<UploadResult> {
  try {
    const { authContext, actor } = await requireAuthorizedActor([
      "superadmin",
      "admin",
      "material_team",
    ]);

    if (!canManageMaterials(actor)) {
      return {
        ok: false,
        error: "You do not have permission to upload materials.",
      };
    }

    const file = formData.get("file");
    if (!(file instanceof File) || !file.size) {
      return {
        ok: false,
        error: "Please choose an Excel file to import.",
      };
    }

    const rows = await parseWorkbookRows(file);
    let imported = 0;

    for (const row of rows) {
      const branchId = String(row.branch_id ?? row.branch ?? "").trim();
      if (!branchId || !canAccessBranch(actor, branchId)) {
        continue;
      }

      const parsed = materialSchema.safeParse({
        sku: String(row.sku ?? "").trim(),
        material_code: String(row.material_code ?? row.materialCode ?? "").trim(),
        name: String(row.name ?? row.material_name ?? "").trim(),
        category: String(row.category ?? "").trim(),
        unit_of_measure: String(row.unit_of_measure ?? row.unit ?? "").trim(),
        expiry_required:
          String(row.expiry_required ?? row.expiry ?? "")
            .trim()
            .toLowerCase() === "true",
        min_threshold: Number(row.min_threshold ?? row.minimum_stock_alert_level ?? 0),
        opening_stock: Number(row.opening_stock ?? 0),
        current_stock: Number(row.current_stock ?? row.closing_stock ?? 0),
        branch_id: branchId,
        active: String(row.status ?? "active").trim().toLowerCase() !== "inactive",
      });

      if (!parsed.success) {
        continue;
      }

      const existingMaterial = await authContext.insforge.database
        .from("materials")
        .select("id")
        .eq("sku", parsed.data.sku)
        .single();

      const materialResult = await saveMaterialAction({
        ...parsed.data,
        id: (existingMaterial.data?.id as string | undefined) ?? undefined,
      });

      if (materialResult.ok) {
        imported += 1;
      }
    }

    await logExcelActivity(authContext.insforge, {
      actorId: actor.id,
      moduleName: "materials",
      operation: "upload",
      fileName: file.name,
      rowCount: imported,
    });

    revalidatePath("/materials");
    revalidatePath("/reports");

    return { ok: true, imported };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to import the workbook.",
    };
  }
}
