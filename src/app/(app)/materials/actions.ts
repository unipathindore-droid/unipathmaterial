"use server";

import { revalidatePath } from "next/cache";

import { requireAuthorizedActor } from "@/app/(app)/action-utils";
import { writeAuditLog } from "@/lib/insforge/server";
import { materialSchema, type MaterialFormValues } from "@/lib/validators/material";
import type { Material } from "@/types/domain";

type MaterialActionResult =
  | { ok: true; material: Material }
  | { ok: false; error: string };

export async function createMaterialAction(
  values: MaterialFormValues,
): Promise<MaterialActionResult> {
  try {
    const { authContext, actor } = await requireAuthorizedActor([
      "superadmin",
      "admin",
      "material_team",
    ]);

    const parsed = materialSchema.safeParse(values);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Please review the material details.",
      };
    }

    const payload = {
      sku: parsed.data.sku.trim(),
      name: parsed.data.name.trim(),
      category: parsed.data.category.trim(),
      unit_of_measure: parsed.data.unit_of_measure.trim(),
      requires_expiry_before_dispatch: parsed.data.expiry_required,
      reorder_level: parsed.data.min_threshold,
      active: parsed.data.active,
    };

    const { data, error } = await authContext.insforge.database
      .from("materials")
      .insert(payload)
      .select(
        "id, sku, name, category, unit_of_measure, expiry_required:requires_expiry_before_dispatch, min_threshold:reorder_level, active",
      )
      .single();

    if (error || !data) {
      return {
        ok: false,
        error: error?.message ?? "Unable to create the material.",
      };
    }

    await writeAuditLog(authContext.insforge, {
      actor_user_id: actor.id,
      subject_user_id: null,
      action: "material.created",
      details: {
        material_id: data.id,
        sku: data.sku,
      },
    });

    revalidatePath("/materials");
    revalidatePath("/dashboard");

    return {
      ok: true,
      material: data as Material,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to create the material.",
    };
  }
}
