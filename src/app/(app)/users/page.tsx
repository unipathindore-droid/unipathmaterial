import { PageHeader } from "@/components/layout/page-header";
import { UserManagementPanel } from "@/components/forms/user-management-panel";
import { assertRouteAccess, ROLE_ACCESS } from "@/lib/access";
import { getCurrentUserProfile } from "@/lib/auth";
import { getAdminConsoleData } from "@/lib/data/app-data";

export default async function UsersPage() {
  const currentUser = await getCurrentUserProfile();
  assertRouteAccess(currentUser, [...ROLE_ACCESS.users]);
  const data = await getAdminConsoleData(currentUser!);

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-sm">
        <PageHeader
          eyebrow="Super Admin"
          title="Create, approve, and track user access"
          description="This page follows the simple access flow: create the user, let them verify email, approve their account, and keep every step in the audit log."
        />
      </section>

      <UserManagementPanel
        users={data.users}
        pendingUsers={data.pendingUsers}
        recentAuditLogs={data.recentAuditLogs}
      />
    </div>
  );
}
