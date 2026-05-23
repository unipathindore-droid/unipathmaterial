"use server";

import { revalidatePath } from "next/cache";

import { canAccessBranch, requireAuthorizedActor } from "@/app/(app)/action-utils";
import { writeAuditLog } from "@/lib/insforge/server";
import { clientSchema, type ClientFormValues } from "@/lib/validators/client";
import type { Client } from "@/types/domain";

type ClientActionResult =
  | { ok: true; client: Client }
  | { ok: false; error: string };

export async function saveClientAction(values: ClientFormValues): Promise<ClientActionResult> {
  try {
    const { authContext, actor } = await requireAuthorizedActor([
      "superadmin",
      "admin",
      "branch_admin",
    ]);

    const parsed = clientSchema.safeParse(values);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Please review the client details.",
      };
    }

    if (!canAccessBranch(actor, parsed.data.branch_id)) {
      return {
        ok: false,
        error: "You can only manage clients for your own branch.",
      };
    }

    const payload = {
      branch_id: parsed.data.branch_id,
      account_owner_id: actor.id,
      client_code: parsed.data.client_code.trim(),
      name: parsed.data.name.trim(),
      email: parsed.data.email?.trim() || null,
      phone: parsed.data.phone?.trim() || null,
      contact_person: parsed.data.contact_person?.trim() || null,
      city: parsed.data.city?.trim() || null,
      state: null,
      address: parsed.data.address?.trim() || null,
      status: parsed.data.status,
    };

    const response = parsed.data.id
      ? await authContext.insforge.database
          .from("clients")
          .update(payload)
          .eq("id", parsed.data.id)
          .select("id, branch_id, client_code, name, email, phone, contact_person, address, city, state, status")
          .single()
      : await authContext.insforge.database
          .from("clients")
          .insert(payload)
          .select("id, branch_id, client_code, name, email, phone, contact_person, address, city, state, status")
          .single();

    if (response.error || !response.data) {
      return {
        ok: false,
        error: response.error?.message ?? "Unable to save the client.",
      };
    }

    await writeAuditLog(authContext.insforge, {
      actor_user_id: actor.id,
      subject_user_id: null,
      action: parsed.data.id ? "client.updated" : "client.created",
      details: {
        client_id: response.data.id,
        client_code: response.data.client_code,
        branch_id: response.data.branch_id,
      },
    });

    revalidatePath("/clients");
    revalidatePath("/dashboard");

    return {
      ok: true,
      client: response.data as Client,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to save the client.",
    };
  }
}
