import { BellRing, FlaskConical, ShieldCheck, Truck } from "lucide-react";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/forms/login-form";
import { getCurrentUserProfile } from "@/lib/auth";
import { APP_NAME } from "@/lib/constants";
import { isInsForgeConfigured } from "@/lib/env";
import { t } from "@/lib/i18n";
import { getCurrentLanguage } from "@/lib/i18n-server";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const [language, profile] = await Promise.all([getCurrentLanguage(), getCurrentUserProfile()]);

  if (profile) {
    redirect("/dashboard");
  }

  const deactivated = resolvedSearchParams?.error === "deactivated";

  const highlights = [
    {
      icon: ShieldCheck,
      title: t(language, "login.highlights.role.title"),
      description: t(language, "login.highlights.role.description"),
    },
    {
      icon: Truck,
      title: t(language, "login.highlights.dispatch.title"),
      description: t(language, "login.highlights.dispatch.description"),
    },
    {
      icon: BellRing,
      title: t(language, "login.highlights.alerts.title"),
      description: t(language, "login.highlights.alerts.description"),
    },
  ];

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(13,148,136,0.18),_transparent_32%),linear-gradient(180deg,#f5fbfb_0%,#edf4f7_46%,#f6f8fb_100%)] px-6 py-10">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-7xl gap-10 lg:grid-cols-[1.25fr_0.9fr]">
        <section className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-slate-950 px-8 py-10 text-white shadow-[0_30px_80px_-35px_rgba(15,23,42,0.7)] lg:px-12 lg:py-14">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(45,212,191,0.25),_transparent_30%),radial-gradient(circle_at_bottom_left,_rgba(56,189,248,0.22),_transparent_35%)]" />
          <div className="relative space-y-8">
            <div className="inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white/80 backdrop-blur">
              <FlaskConical className="h-4 w-4" />
              {t(language, "login.badge") || APP_NAME}
            </div>
            <div className="max-w-2xl space-y-4">
              <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
                {t(language, "login.hero_title")}
              </h1>
              <p className="max-w-xl text-base leading-7 text-slate-200/90">
                {t(language, "login.hero_description")}
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {highlights.map((item) => (
                <div
                  key={item.title}
                  className="rounded-3xl border border-white/12 bg-white/8 p-5 backdrop-blur-sm"
                >
                  <item.icon className="h-5 w-5 text-teal-300" />
                  <h2 className="mt-4 text-lg font-semibold">{item.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-200/80">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="flex items-center">
          <div className="w-full rounded-[2rem] border border-white/80 bg-white/90 p-8 shadow-[0_25px_60px_-35px_rgba(15,23,42,0.55)] backdrop-blur lg:p-10">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-teal-700">
                {t(language, "login.sign_in")}
              </p>
              <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
                {t(language, "login.console_title")}
              </h2>
              <p className="text-sm leading-6 text-slate-600">
                {t(language, "login.console_description")}
              </p>
            </div>

            {!isInsForgeConfigured() ? (
              <div className="mt-8 rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-800">
                Live login is inactive because InsForge environment variables are not configured yet.
                Add your InsForge URL and anon key to continue with real authentication.
              </div>
            ) : null}

            <div className="mt-8">
              {deactivated ? (
                <div className="mb-4 rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm leading-6 text-rose-800">
                  Your account is deactivated. Contact admin.
                </div>
              ) : null}
              <LoginForm />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
