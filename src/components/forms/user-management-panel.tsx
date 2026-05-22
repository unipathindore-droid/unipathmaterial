"use client";

import { useActionState } from "react";

import { approveUserAction, createUserAction } from "@/app/(app)/users/actions";
import { DataTable } from "@/components/tables/data-table";
import { StatusPill } from "@/components/layout/status-pill";
import type { AuditLogRecord, ManagedUserRecord } from "@/types/domain";
import { formatDateTime } from "@/lib/utils";

const initialState = {
  error: "",
  success: "",
};

const roleOptions = [
  { value: "admin", label: "Admin" },
  { value: "branch_admin", label: "Branch Admin" },
  { value: "sales", label: "Sales" },
  { value: "phlebotomist", label: "Phlebotomist" },
  { value: "material_team", label: "Material Team" },
  { value: "dispatch_manager", label: "Dispatch Manager" },
];

export function UserManagementPanel({
  users,
  pendingUsers,
  recentAuditLogs,
}: {
  users: ManagedUserRecord[];
  pendingUsers: ManagedUserRecord[];
  recentAuditLogs: AuditLogRecord[];
}) {
  const [state, formAction, pending] = useActionState(createUserAction, initialState);

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-sm">
        <div className="mb-5">
          <h2 className="text-xl font-semibold text-slate-950">Add a new user</h2>
          <p className="mt-2 text-sm text-slate-600">
            Create the account here, ask the user to verify the email code, and then approve them
            from the list below.
          </p>
        </div>

        <form action={formAction} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="full_name">
              Full Name
            </label>
            <input
              id="full_name"
              name="full_name"
              required
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500"
              placeholder="User full name"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500"
              placeholder="user@unipath.in"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="password">
              Temporary Password
            </label>
            <input
              id="password"
              name="password"
              type="text"
              required
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500"
              placeholder="Minimum 8 characters"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="role">
              Role
            </label>
            <select
              id="role"
              name="role"
              required
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500"
              defaultValue="admin"
            >
              {roleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {(state.error || state.success) ? (
            <div
              className={`md:col-span-2 rounded-2xl border px-4 py-3 text-sm ${
                state.error
                  ? "border-rose-200 bg-rose-50 text-rose-700"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700"
              }`}
            >
              {state.error || state.success}
            </div>
          ) : null}

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? "Creating user..." : "Create user"}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-sm">
        <div className="mb-5">
          <h2 className="text-xl font-semibold text-slate-950">Pending approvals</h2>
          <p className="mt-2 text-sm text-slate-600">
            Approve only after the user has verified the code sent to their inbox.
          </p>
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
              header: "Email Verified",
              render: (row) => (row.email_verified_at ? formatDateTime(row.email_verified_at) : "Waiting"),
            },
            {
              key: "status",
              header: "Status",
              render: (row) => <StatusPill value={row.approval_status ?? "pending"} />,
            },
            {
              key: "action",
              header: "Action",
              render: (row) => (
                <form action={approveUserAction}>
                  <input type="hidden" name="user_id" value={row.id} />
                  <button
                    type="submit"
                    disabled={!row.email_verified_at}
                    className="rounded-2xl bg-teal-700 px-4 py-2 text-xs font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Approve
                  </button>
                </form>
              ),
            },
          ]}
          rows={pendingUsers}
        />
      </section>

      <section className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-sm">
        <div className="mb-5">
          <h2 className="text-xl font-semibold text-slate-950">All users</h2>
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
              key: "approval",
              header: "Approval",
              render: (row) => <StatusPill value={row.approval_status ?? "pending"} />,
            },
            {
              key: "login",
              header: "Last Login",
              render: (row) => (row.last_login_at ? formatDateTime(row.last_login_at) : "No login yet"),
            },
          ]}
          rows={users}
        />
      </section>

      <section className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-sm">
        <div className="mb-5">
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
              key: "created_at",
              header: "Time",
              render: (row) => formatDateTime(row.created_at),
            },
          ]}
          rows={recentAuditLogs}
        />
      </section>
    </div>
  );
}
