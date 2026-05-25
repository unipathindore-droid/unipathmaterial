"use server";

import { revalidatePath } from "next/cache";

import { canAccessBranch, hasPermission, requireAuthorizedActor } from "@/app/(app)/action-utils";
import { parseWorkbookRows } from "@/lib/excel";
import { writeAuditLog } from "@/lib/insforge/server";
import { monthlyStockUpdateSchema, type MonthlyStockUpdateFormValues } from "@/lib/validators/stock-update";
import type { MonthlyStockUpdateRecord } from "@/types/domain";

type StockUpdateActionResult =
  | { ok: true; record: MonthlyStockUpdateRecord }
  | { ok: false; error: string };

type UploadResult =
  | { ok: true; imported: number }
  | { ok: false; error: string };

function canManageStock(
  actor: Awaited<ReturnType<typeof requireAuthorizedActor>>["actor"],
) {
  return actor.role === "superadmin" || actor.role === "admin" || hasPermission(actor, "manage_stock");
}

function calculateClosingStock(values: MonthlyStockUpdateFormValues) {
  return values.opening_stock + values.received_stock - values.used_stock - values.damaged_stock;
}

export async function saveMonthlyStockUpdateAction(
  values: MonthlyStockUpdateFormValues,
): Promise<StockUpdateActionResult> {
  try {
    const { authContext, actor } = await requireAuthorizedActor(["superadmin", "admin"]);

    if (!canManageStock(actor)) {
      return {
        ok: false,
        error: "You do not have permission to update stock.",
      };
    }

    const parsed = monthlyStockUpdateSchema.safeParse(values);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Please review the stock details.",
      };
    }

    if (!canAccessBranch(actor, parsed.data.branch_id)) {
      return {
        ok: false,
        error: "You can update stock only for your assigned branches.",
      };
    }

    const closingStock = calculateClosingStock(parsed.data);
    let previousRecord: Record<string, unknown> | null = null;

    if (parsed.data.id) {
      const existing = await authContext.insforge.database
        .from("monthly_stock_updates")
        .select("*")
        .eq("id", parsed.data.id)
        .single();
      previousRecord = (existing.data as Record<string, unknown> | null) ?? null;
    }

    const payload = {
      branch_id: parsed.data.branch_id,
      material_id: parsed.data.material_id,
      month: parsed.data.month,
      opening_stock: parsed.data.opening_stock,
      received_stock: parsed.data.received_stock,
      used_stock: parsed.data.used_stock,
      damaged_stock: parsed.data.damaged_stock,
      closing_stock: closingStock,
      remarks: parsed.data.remarks?.trim() || null,
      created_by: parsed.data.id ? undefined : actor.id,
      updated_by: actor.id,
    };

    const response = parsed.data.id
      ? await authContext.insforge.database
          .from("monthly_stock_updates")
          .update(payload)
          .eq("id", parsed.data.id)
          .select("*")
          .single()
      : await authContext.insforge.database
          .from("monthly_stock_updates")
          .insert(payload)
          .select("*")
          .single();

    if (response.error || !response.data) {
      return {
        ok: false,
        error: response.error?.message ?? "Unable to save the stock update.",
      };
    }

    const inventoryUpdate = await authContext.insforge.database
      .from("branch_inventory")
      .update({
        opening_stock: parsed.data.opening_stock,
        available_quantity: closingStock,
        updated_by: actor.id,
      })
      .eq("branch_id", parsed.data.branch_id)
      .eq("material_id", parsed.data.material_id);

    if (inventoryUpdate.error) {
      return {
        ok: false,
        error: inventoryUpdate.error.message,
      };
    }

    await writeAuditLog(authContext.insforge, {
      actor_user_id: actor.id,
      subject_user_id: null,
      action: parsed.data.id ? "stock.updated" : "stock.created",
      module_name: "monthly_stock_updates",
      record_id: String(response.data.id),
      old_value: previousRecord,
      new_value: response.data as Record<string, unknown>,
      user_role: actor.role,
      details: {
        branch_id: parsed.data.branch_id,
        material_id: parsed.data.material_id,
      },
    });

    revalidatePath("/stock-updates");
    revalidatePath("/materials");
    revalidatePath("/dashboard");

    return {
      ok: true,
      record: response.data as MonthlyStockUpdateRecord,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to save the stock update.",
    };
  }
}

export async function uploadMonthlyStockWorkbookAction(formData: FormData): Promise<UploadResult> {
  try {
    const { authContext, actor } = await requireAuthorizedActor(["superadmin", "admin"]);

    if (!canManageStock(actor)) {
      return {
        ok: false,
        error: "You do not have permission to upload stock updates.",
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
      const branchId = String(row.branch_id ?? "").trim();
      if (!branchId || !canAccessBranch(actor, branchId)) {
        continue;
      }

      const parsed = monthlyStockUpdateSchema.safeParse({
        branch_id: branchId,
        material_id: String(row.material_id ?? "").trim(),
        month: String(row.month ?? "").trim(),
        opening_stock: Number(row.opening_stock ?? 0),
        received_stock: Number(row.received_stock ?? 0),
        used_stock: Number(row.used_stock ?? 0),
        damaged_stock: Number(row.damaged_stock ?? 0),
        remarks: String(row.remarks ?? "").trim(),
      });

      if (!parsed.success) {
        continue;
      }

      const result = await saveMonthlyStockUpdateAction(parsed.data);
      if (result.ok) {
        imported += 1;
      }
    }

    await authContext.insforge.database.from("excel_activity_logs").insert({
      module_name: "monthly_stock_updates",
      operation: "upload",
      file_name: file.name,
      row_count: imported,
      created_by: actor.id,
    });

    revalidatePath("/stock-updates");
    revalidatePath("/reports");

    return { ok: true, imported };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to import the stock workbook.",
    };
  }
}
