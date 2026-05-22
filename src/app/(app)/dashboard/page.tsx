import { Activity, BadgeCheck, ClipboardCheck, Users } from "lucide-react";

import { DashboardRealtimeSync } from "@/components/dashboard/dashboard-realtime-sync";
import { MetricCard } from "@/components/dashboard/metric-card";
import { PageHeader } from "@/components/layout/page-header";
import { StatusPill } from "@/components/layout/status-pill";
import { DataTable } from "@/components/tables/data-table";
import { assertRouteAccess, ROLE_ACCESS } from "@/lib/access";
import { getCurrentUserProfile } from "@/lib/auth";
import { getAdminConsoleData } from "@/lib/data/app-data";
import { formatDateTime } from "@/lib/utils";

export default async function DashboardPage() {
  const currentUser = await getCurrentUserProfile();
  assertRouteAccess(currentUser, [...ROLE_ACCESS.dashboard]);
  const data = await getAdminConsoleData(currentUser!);

  return (
    <div className="space-y-6">
      <DashboardRealtimeSync />

      <section className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-sm">
        <PageHeader
          eyebrow={currentUser?.role === "superadmin" ? "Super Admin Dashboard" : "Dashboard"}
          title="Simple account approval and audit control"
          description="The core flow lives here: create users, let them verify email, approve access, and track every login or approval event without extra operational noise."
        />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total Users" value={data.metrics.totalUsers} helper="Every app profile currently present in the system." />
        <MetricCard label="Pending Approvals" value={data.metrics.pendingApprovals} helper="Users who still need a Super Admin approval after email verification." />
        <MetricCard label="Approved Users" value={data.metrics.approvedUsers} helper="Active users who can already sign in and access the product." />
        <MetricCard label="Recent Audit Events" value={data.metrics.auditEvents} helper="Latest access and approval actions captured in the audit log." />
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <ClipboardCheck className="h-5 w-5 text-teal-700" />
            <h2 className="text-xl font-semibold text-slate-950">Pending approval queue</h2>
          </div>

          <DataTable
            columns={[
              {
                key: "user",
                header: "User",
                render: (row) => (
                  <div>
                    <p className="font-semibold text-slate-900">{row.full_name}</p>
                    <p className="text-slate-500">{row.email}</p>
                  </div>
                ),
              },
              {
                key: "role",
                header: "Role",
                render: (row) => row.role,
              },
              {
                key: "verified",
                header: "Verified",
                render: (row) => (row.email_verified_at ? formatDateTime(row.email_verified_at) : "Waiting"),
              },
              {
                key: "status",
                header: "Status",
                render: (row) => <StatusPill value={row.approval_status ?? "pending"} />,
              },
            ]}
            rows={data.pendingUsers}
          />
        </div>

        <div className="space-y-6">
          <div className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <Activity className="h-5 w-5 text-sky-700" />
              <h2 className="text-xl font-semibold text-slate-950">Recent audit log</h2>
            </div>

            <DataTable
              columns={[
                {
                  key: "action",
                  header: "Action",
                  render: (row) => row.action,
                },
                {
                  key: "actor",
                  header: "Actor",
                  render: (row) => row.actor_name ?? "System",
                },
                {
                  key: "subject",
                  header: "Subject",
                  render: (row) => row.subject_name ?? "User",
                },
                {
                  key: "time",
                  header: "Time",
                  render: (row) => formatDateTime(row.created_at),
                },
              ]}
              rows={data.recentAuditLogs}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[1.75rem] border border-indigo-100 bg-indigo-50 p-5">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-indigo-700" />
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-700">
                  User Control
                </p>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-700">
                Super Admin can create any operational role, while the invited user keeps that role
                after approval.
              </p>
            </div>

            <div className="rounded-[1.75rem] border border-emerald-100 bg-emerald-50 p-5">
              <div className="flex items-center gap-3">
                <BadgeCheck className="h-5 w-5 text-emerald-700" />
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                  Access Rule
                </p>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-700">
                A verified email alone is not enough. Approval status must be set to approved
                before login is allowed.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
