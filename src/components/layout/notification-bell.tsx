"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";

import { markNotificationRead } from "@/app/(app)/actions";
import { cn, formatDateTime } from "@/lib/utils";
import type { NotificationRecord } from "@/types/domain";
import { useLanguage } from "@/components/providers/language-provider";

export function NotificationBell({
  initialNotifications,
}: {
  initialNotifications: NotificationRecord[];
}) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { translate } = useLanguage();

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read_at).length,
    [notifications],
  );

  function markLocalRead(id: string) {
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === id
          ? { ...notification, read_at: notification.read_at ?? new Date().toISOString() }
          : notification,
      ),
    );
  }

  function handleMarkRead(id: string) {
    startTransition(async () => {
      const result = await markNotificationRead(id);

      if (result.ok) {
        markLocalRead(id);
      }
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="relative inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
      >
        <Bell className="h-4 w-4" />
        {translate("notifications.title")}
        {unreadCount ? (
          <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-rose-500 px-2 py-0.5 text-xs font-semibold text-white">
            {unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-20 mt-3 w-[26rem] rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-[0_24px_60px_-30px_rgba(15,23,42,0.45)]">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-950">{translate("notifications.title")}</p>
              <p className="text-xs text-slate-500">{unreadCount} {translate("notifications.unread")}</p>
            </div>
            <button
              type="button"
              onClick={() =>
                notifications
                  .filter((notification) => !notification.read_at)
                  .forEach((notification) => handleMarkRead(notification.id))
              }
              disabled={isPending || unreadCount === 0}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <CheckCheck className="h-4 w-4" />
              {translate("notifications.mark_all_read")}
            </button>
          </div>

          <div className="max-h-[28rem] space-y-3 overflow-y-auto pr-1">
            {notifications.length ? (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "rounded-2xl border px-4 py-4",
                    notification.read_at
                      ? "border-slate-200 bg-slate-50"
                      : "border-teal-200 bg-teal-50",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{notification.title}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{notification.body}</p>
                      <p className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-400">
                        {formatDateTime(notification.created_at)}
                      </p>
                    </div>
                    {!notification.read_at ? (
                      <button
                        type="button"
                        onClick={() => handleMarkRead(notification.id)}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                      >
                        {translate("notifications.read")}
                      </button>
                    ) : null}
                  </div>
                  {notification.route ? (
                    <Link
                      href={notification.route}
                      onClick={() => setOpen(false)}
                      className="mt-3 inline-flex text-sm font-medium text-teal-700 transition hover:text-teal-800"
                    >
                      {translate("notifications.open")}
                    </Link>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                {translate("notifications.empty")}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
