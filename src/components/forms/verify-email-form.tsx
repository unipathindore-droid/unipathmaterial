"use client";

import { useActionState } from "react";

import {
  resendVerificationAction,
  verifyEmailAction,
} from "@/app/(auth)/verify-email/actions";

const initialState = {
  error: "",
  success: "",
};

export function VerifyEmailForm({ defaultEmail = "" }: { defaultEmail?: string }) {
  const [verifyState, verifyFormAction, verifyPending] = useActionState(
    verifyEmailAction,
    initialState,
  );
  const [resendState, resendFormAction, resendPending] = useActionState(
    resendVerificationAction,
    initialState,
  );

  const message = verifyState.error || resendState.error || verifyState.success || resendState.success;
  const messageTone =
    verifyState.error || resendState.error
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : "border-emerald-200 bg-emerald-50 text-emerald-700";

  return (
    <div className="space-y-6">
      <form action={verifyFormAction} className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            defaultValue={defaultEmail}
            required
            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-0 transition focus:border-teal-500"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="otp">
            Verification Code
          </label>
          <input
            id="otp"
            name="otp"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm tracking-[0.35em] text-slate-900 outline-none ring-0 transition focus:border-teal-500"
            placeholder="123456"
          />
        </div>

        {message ? (
          <p className={`rounded-2xl border px-4 py-3 text-sm ${messageTone}`}>{message}</p>
        ) : null}

        <button
          type="submit"
          disabled={verifyPending}
          className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {verifyPending ? "Verifying..." : "Verify Email"}
        </button>
      </form>

      <form action={resendFormAction} className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <input type="hidden" name="email" value={defaultEmail} />
        <p className="text-sm text-slate-600">
          Didn&apos;t receive the code? Send a fresh verification email.
        </p>
        <button
          type="submit"
          disabled={resendPending || !defaultEmail}
          className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {resendPending ? "Sending..." : "Resend Code"}
        </button>
      </form>
    </div>
  );
}
