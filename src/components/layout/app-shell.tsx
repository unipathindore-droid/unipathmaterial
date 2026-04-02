"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Building2, ChevronRight, LogOut, Package2, Shield } from "lucide-react";

import { NAV_ITEMS, ROLE_LABEL_KEYS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { NotificationRecord, UserProfile } from "@/types/domain";
import { LanguageToggle } from "@/components/layout/language-toggle";
import { NotificationBell } from "@/components/layout/notification-bell";
import { useLanguage } from "@/components/providers/language-provider";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function AppShell({
  user,
  notifications,
  children,
}: {
  user: UserProfile;
  notifications: NotificationRecord[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { translate } = useLanguage();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(15,118,110,0.12),_transparent_22%),linear-gradient(180deg,#f4faf9_0%,#eef2f7_100%)]">
      <div className="mx-auto grid min-h-screen max-w-[1600px] gap-6 px-4 py-4 lg:grid-cols-[280px_1fr] lg:px-6">
        <aside className="rounded-[2rem] border border-white/70 bg-slate-950 p-6 text-white shadow-[0_30px_80px_-35px_rgba(15,23,42,0.8)]">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-white/10 p-3">
              <Package2 className="h-6 w-6 text-teal-300" />
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-white/50">UniPath</p>
              <h1 className="text-xl font-semibold">SupplyOS</h1>
            </div>
          </div>

          <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-500/20 text-sm font-semibold text-teal-100">
                {initials(user.full_name)}
              </div>
              <div>
                <p className="font-medium">{user.full_name}</p>
                <p className="text-sm text-white/60">{translate(ROLE_LABEL_KEYS[user.role])}</p>
              </div>
            </div>
            <div className="mt-4 space-y-2 rounded-2xl bg-white/5 p-3 text-sm text-white/70">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-teal-300" />
                <span>{user.branch?.name ?? translate("shell.multi_branch")}</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-teal-300" />
                <span>{translate("shell.branch_filtering")}</span>
              </div>
            </div>
          </div>

          <nav className="mt-8 space-y-2">
            {NAV_ITEMS.filter((item) => item.roles.includes(user.role)).map((item) => {
              const active = pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-medium transition",
                    active
                      ? "bg-white text-slate-950 shadow-sm"
                      : "text-white/70 hover:bg-white/8 hover:text-white",
                  )}
                >
                  <span>{translate(item.labelKey)}</span>
                  <ChevronRight className="h-4 w-4" />
                </Link>
              );
            })}
          </nav>

          <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-2 text-sm text-white/80">
              <Bell className="h-4 w-4 text-teal-300" />
              <span>
                {notifications.filter((item) => !item.read_at).length} {translate("shell.unread_alerts")}
              </span>
            </div>
            <div className="mt-3 space-y-3">
              {notifications.slice(0, 3).map((notification) => (
                <div key={notification.id} className="rounded-2xl bg-white/5 p-3 text-sm">
                  <p className="font-medium text-white">{notification.title}</p>
                  <p className="mt-1 text-white/60">{notification.body}</p>
                </div>
              ))}
            </div>
          </div>

          <Link
            href="/login"
            className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-white/65 transition hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            {translate("shell.switch_account")}
          </Link>
        </aside>

        <div className="min-w-0 space-y-6">
          <div className="flex flex-wrap justify-end gap-3">
            <LanguageToggle />
            <NotificationBell initialNotifications={notifications} />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
