import type { ReactNode } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { portalNav } from "@/lib/nav";
import { getCurrentProfile, ROLE_LABELS } from "@/lib/auth/get-profile";
import { getRecentNotifications } from "@/lib/notifications";
import { createClient } from "@/lib/supabase/server";
import { RequestLessonModal } from "@/app/portal/lessons/request-lesson-modal";

export default async function PortalLayout({ children }: { children: ReactNode }) {
  const profile = await getCurrentProfile();
  const isStudent = profile?.role === "student";

  const [notifications, subjects] = await Promise.all([
    profile ? getRecentNotifications(profile.id) : Promise.resolve([]),
    isStudent
      ? (await createClient()).from("subjects").select("*").eq("active", true).order("name").then((r) => r.data)
      : Promise.resolve(null),
  ]);

  return (
    <AppShell
      items={portalNav}
      roleLabel={profile ? ROLE_LABELS[profile.role] : "תלמיד"}
      userName={profile?.full_name ?? profile?.email}
      profileHref="/portal/profile"
      userId={profile?.id}
      notifications={notifications}
      quickAction={
        isStudent ? (
          <RequestLessonModal subjects={subjects ?? []} triggerClassName="px-3 py-1.5 text-xs" />
        ) : undefined
      }
    >
      {children}
    </AppShell>
  );
}
