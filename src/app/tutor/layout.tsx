import type { ReactNode } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { tutorNav } from "@/lib/nav";
import { getCurrentProfile, ROLE_LABELS } from "@/lib/auth/get-profile";
import { getRecentNotifications } from "@/lib/notifications";

export default async function TutorLayout({ children }: { children: ReactNode }) {
  const profile = await getCurrentProfile();
  const notifications = profile ? await getRecentNotifications(profile.id) : [];

  return (
    <AppShell
      items={tutorNav}
      roleLabel={profile ? ROLE_LABELS[profile.role] : "מורה פרטי"}
      userName={profile?.full_name ?? profile?.email}
      profileHref="/tutor/profile"
      userId={profile?.id}
      notifications={notifications}
    >
      {children}
    </AppShell>
  );
}
