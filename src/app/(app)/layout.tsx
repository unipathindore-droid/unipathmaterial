import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { getCurrentUserProfile } from "@/lib/auth";
import { getNotifications } from "@/lib/data/app-data";

export default async function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    redirect("/login");
  }

  const notifications = await getNotifications(profile);

  return (
    <AppShell user={profile!} notifications={notifications}>
      {children}
    </AppShell>
  );
}
