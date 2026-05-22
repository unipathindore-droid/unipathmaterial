"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createServerInsForgeClient, writeAuditLog } from "@/lib/insforge/server";

type VerifyEmailState = {
  error: string;
  success: string;
};

export async function verifyEmailAction(
  _: VerifyEmailState,
  formData: FormData,
): Promise<VerifyEmailState> {
  const email = String(formData.get("email") ?? "").trim();
  const otp = String(formData.get("otp") ?? "").trim();

  const insforge = createServerInsForgeClient();
  const { data, error } = await insforge.auth.verifyEmail({ email, otp });

  if (error) {
    return {
      error: error.message,
      success: "",
    };
  }

  if (data?.accessToken && data.user?.id) {
    const authenticatedClient = createServerInsForgeClient(data.accessToken);
    await authenticatedClient.database
      .from("profiles")
      .update({ email_verified_at: new Date().toISOString() })
      .eq("id", data.user.id);

    await writeAuditLog(authenticatedClient, {
      actor_user_id: data.user.id,
      subject_user_id: data.user.id,
      action: "user.email_verified",
      details: { email },
    });

    revalidatePath("/dashboard");
    revalidatePath("/users");
  }

  redirect("/login?verified=1");
}

export async function resendVerificationAction(
  _: VerifyEmailState,
  formData: FormData,
): Promise<VerifyEmailState> {
  const email = String(formData.get("email") ?? "").trim();

  const insforge = createServerInsForgeClient();
  const { error } = await insforge.auth.resendVerificationEmail({
    email,
    redirectTo: "http://localhost:3000/login",
  });

  if (error) {
    return {
      error: error.message,
      success: "",
    };
  }

  return {
    error: "",
    success: "A new verification code has been sent to your email address.",
  };
}
