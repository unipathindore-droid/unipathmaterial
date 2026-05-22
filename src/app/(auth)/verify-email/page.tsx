import Link from "next/link";

import { VerifyEmailForm } from "@/components/forms/verify-email-form";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const email = typeof params.email === "string" ? params.email : "";

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(13,148,136,0.18),_transparent_32%),linear-gradient(180deg,#f5fbfb_0%,#edf4f7_46%,#f6f8fb_100%)] px-6 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-3xl items-center">
        <section className="w-full rounded-[2rem] border border-white/80 bg-white/90 p-8 shadow-[0_25px_60px_-35px_rgba(15,23,42,0.55)] backdrop-blur lg:p-10">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-teal-700">
              Verify account
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
              Enter the 6-digit code from your email
            </h1>
            <p className="text-sm leading-6 text-slate-600">
              Once your code is accepted, your email becomes verified. If Super Admin created this
              account for you, the final step is approval inside the app before login is allowed.
            </p>
          </div>

          <div className="mt-8">
            <VerifyEmailForm defaultEmail={email} />
          </div>

          <div className="mt-6 text-sm text-slate-600">
            <Link href="/login" className="font-medium text-teal-700 transition hover:text-teal-800">
              Back to login
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
