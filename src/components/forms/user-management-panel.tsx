"use client";

import { useActionState, useMemo } from "react";

import {
  createUserAction,
  deleteUserAction,
  resetUserPasswordAction,
  setUserStatusAction,
} from "@/app/(app)/users/actions";
import { DataTable } from "@/components/tables/data-table";
import { StatusPill } from "@/components/layout/status-pill";
import type { AppRole, AuditLogRecord, Branch, ManagedUserRecord, UserProfile } from "@/types/domain";
import { formatDateTime } from "@/lib/utils";

const initialState = {
  error: "",
  success: "",
};

export function UserManagementPanel({
  users,
  recentAuditLogs,
  branches,
  currentUser,
}: {
  users: ManagedUserRecord[];
  recentAuditLogs: AuditLogRecord[];
  branches: Branch[];
  currentUser: UserProfile;
}) {
  const [state, formAction, pending] = useActionState(createUserAction, initialState);
  const roleOptions = useMemo(
    () =>
      currentUser.role === "superadmin"
        ? [
            { value: "admin", label: "Admin" },
            { value: "branch_admin", label: "Branch Admin" },
            { value: "sales", label: "Sales" },
            { value: "phlebotomist", label: "Phlebotomist" },
            { value: "material_team", label: "Material Team" },
            { value: "dispatch_manager", label: "Dispatch Manager" },
          ]
        : [
            { value: "branch_admin", label: "Branch Admin" },
            { value: "sales", label: "Sales" },
            { value: "phlebotomist", label: "Phlebotomist" },
            { value: "material_team", label: "Material Team" },
            { value: "dispatch_manager", label: "Dispatch Manager" },
          ],
    [currentUser.role],
  );
  const canManageRow = (row: ManagedUserRecord) =>
    currentUser.role === "superadmin" ||
    !(["superadmin", "admin"] as AppRole[]).includes(row.role);

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-sm">
        <div className="mb-5">
          <h2 className="text-xl font-semibold text-slate-950">Create user</h2>
          <p className="mt-2 text-sm text-slate-600">
            Admin and Super Admin can create users. Active users can sign in immediately with the
            password set here.
          </p>
        </div>

        <form action={formAction} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Field label="Full Name" name="full_name" placeholder="User full name" required />
          <Field label="Mobile Number" name="mobile_number" placeholder="9876543210" />
          <Field label="Email" name="email" type="email" placeholder="user@unipath.in" required />
          <Field label="Password" name="password" type="password" placeholder="Minimum 8 characters" required />

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Role</span>
            <select
              name="role"
              required
              defaultValue={roleOptions[0]?.value}
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500"
            >
              {roleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Assigned Branch</span>
            <select
              name="branch_id"
              defaultValue={currentUser.branch_id ?? ""}
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500"
            >
              <option value="">No primary branch</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 md:col-span-2 xl:col-span-3">
            <span className="text-sm font-medium text-slate-700">
              Managed Branch IDs
              <span className="ml-2 text-xs text-slate-500">(comma separated, for Admin only)</span>
            </span>
            <input
              name="managed_branch_ids"
              placeholder={branches.map((branch) => branch.id).slice(0, 2).join(", ")}
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Status</span>
            <select
              name="status"
              defaultValue="active"
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>

          <div className="space-y-3 md:col-span-2 xl:col-span-3">
            <p className="text-sm font-medium text-slate-700">Permissions</p>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <PermissionCheckbox name="permission_view_materials" label="View Materials" defaultChecked />
              <PermissionCheckbox name="permission_manage_materials" label="Manage Materials" />
              <PermissionCheckbox name="permission_view_dispatch" label="View Dispatch" defaultChecked />
              <PermissionCheckbox name="permission_manage_dispatch" label="Manage Dispatch" />
              <PermissionCheckbox name="permission_manage_stock" label="Manage Stock" />
              <PermissionCheckbox name="permission_view_reports" label="View Reports" />
              <PermissionCheckbox name="permission_create_requests" label="Create Requests" defaultChecked />
              <PermissionCheckbox name="permission_manage_clients" label="Manage Clients" />
            </div>
          </div>

          {state.error || state.success ? (
            <div
              className={`xl:col-span-3 rounded-2xl border px-4 py-3 text-sm ${
                state.error
                  ? "border-rose-200 bg-rose-50 text-rose-700"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700"
              }`}
            >
              {state.error || state.success}
            </div>
          ) : null}

          <div className="xl:col-span-3">
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
              key: "branch",
              header: "Branch",
              render: (row) => row.branch?.name ?? "System-wide",
            },
            {
              key: "status",
              header: "Status",
              render: (row) => <StatusPill value={row.is_active ? "active" : "inactive"} />,
            },
            {
              key: "login",
              header: "Last Login",
              render: (row) => (row.last_login_at ? formatDateTime(row.last_login_at) : "No login yet"),
            },
            {
              key: "actions",
              header: "Actions",
              render: (row) =>
                canManageRow(row) ? (
                  <div className="flex min-w-72 flex-col gap-2">
                    <form action={resetUserPasswordAction} className="flex gap-2">
                      <input type="hidden" name="user_id" value={row.id} />
                      <input
                        name="password"
                        type="password"
                        minLength={8}
                        placeholder="New password"
                        className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none transition focus:border-teal-500"
                      />
                      <button
                        type="submit"
                        className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                      >
                        Reset
                      </button>
                    </form>
                    <div className="flex gap-2">
                      {row.id !== currentUser.id ? (
                        <>
                          <form action={setUserStatusAction}>
                            <input type="hidden" name="user_id" value={row.id} />
                            <input
                              type="hidden"
                              name="next_status"
                              value={row.is_active ? "inactive" : "active"}
                            />
                            <button
                              type="submit"
                              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-teal-500 hover:text-teal-700"
                            >
                              {row.is_active ? "Deactivate" : "Activate"}
                            </button>
                          </form>
                          <form action={deleteUserAction}>
                            <input type="hidden" name="user_id" value={row.id} />
                            <button
                              type="submit"
                              className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100"
                            >
                              Delete
                            </button>
                          </form>
                        </>
                      ) : (
                        <span className="text-xs text-slate-500">Current session</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <span className="text-xs text-slate-500">Restricted</span>
                ),
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
              render: (row) => (
                <div>
                  <p className="font-medium text-slate-900">{row.action}</p>
                  <p className="text-slate-500">{row.module_name ?? "system"}</p>
                </div>
              ),
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

function Field({
  label,
  name,
  placeholder,
  required,
  type = "text",
}: {
  label: string;
  name: string;
  placeholder: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500"
      />
    </label>
  );
}

function PermissionCheckbox({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="h-4 w-4 rounded border-slate-300" />
      <span>{label}</span>
    </label>
  );
}
