import type { ReactNode } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { tutorNav } from "@/lib/nav";
import { getCurrentProfile, ROLE_LABELS } from "@/lib/auth/get-profile";

export default async function TutorLayout({ children }: { children: ReactNode }) {
  const profile = await getCurrentProfile();

  return (
    <AppShell
      items={tutorNav}
      roleLabel={profile ? ROLE_LABELS[profile.role] : "מורה פרטי"}
      userName={profile?.full_name ?? profile?.email}
    >
      {children}
    </AppShell>
  );
}
