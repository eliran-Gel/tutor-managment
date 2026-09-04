import { Suspense, type ReactNode } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { portalNav } from "@/lib/nav";
import { getCurrentProfile, ROLE_LABELS } from "@/lib/auth/get-profile";
import { getRecentNotifications } from "@/lib/notifications";
import { createClient } from "@/lib/supabase/server";
import { getSelectedChild } from "@/lib/portal/get-selected-child";
import { ChildSwitcher } from "@/components/child-switcher";
import { RequestLessonModal } from "@/app/portal/lessons/request-lesson-modal";

export default async function PortalLayout({ children }: { children: ReactNode }) {
  const profile = await getCurrentProfile();
  const isStudent = profile?.role === "student";
  const supabase = await createClient();

  const [notifications, subjects, { children: linkedChildren, needsSelector }] = await Promise.all([
    profile ? getRecentNotifications(profile.id) : Promise.resolve([]),
    isStudent
      ? supabase.from("subjects").select("*").eq("active", true).order("name").then((r) => r.data)
      : Promise.resolve(null),
    getSelectedChild(supabase, profile),
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
        ) : needsSelector ? (
          // Suspense boundary required around useSearchParams (inside
          // ChildSwitcher) - Next.js opts the whole route into a build
          // error otherwise, since reading the URL client-side normally
          // forces client-only rendering for everything below it.
          <Suspense fallback={null}>
            <ChildSwitcher options={linkedChildren} />
          </Suspense>
        ) : undefined
      }
    >
      {children}
    </AppShell>
  );
}
