import { PageHeader } from "@/components/layout/page-header";
import { UserManagementPanel } from "@/components/forms/user-management-panel";
import { assertRouteAccess, ROLE_ACCESS } from "@/lib/access";
import { getCurrentUserProfile } from "@/lib/auth";
import { getAdminConsoleData, getBranches } from "@/lib/data/app-data";

export default async function UsersPage() {
  const currentUser = await getCurrentUserProfile();
  assertRouteAccess(currentUser, [...ROLE_ACCESS.users]);
  const [data, branches] = await Promise.all([getAdminConsoleData(currentUser!), getBranches()]);

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-sm">
        <PageHeader
          eyebrow="User Management"
          title="Create, approve, and track user access"
          description="Super Admin and Admin can create users, approve access after verification, and keep every important step in the audit trail."
        />
      </section>

      <UserManagementPanel
        users={data.users}
        pendingUsers={data.pendingUsers}
        recentAuditLogs={data.recentAuditLogs}
        branches={branches}
        currentUser={currentUser!}
      />
    </div>
  );
}
