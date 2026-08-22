import type { ReactNode } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { portalNav } from "@/lib/nav";
import { getCurrentProfile, ROLE_LABELS } from "@/lib/auth/get-profile";

export default async function PortalLayout({ children }: { children: ReactNode }) {
  const profile = await getCurrentProfile();

  return (
    <AppShell
      items={portalNav}
      roleLabel={profile ? ROLE_LABELS[profile.role] : "תלמיד"}
      userName={profile?.full_name ?? profile?.email}
    >
      {children}
    </AppShell>
  );
}
