import type { ReactNode } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { tutorNav } from "@/lib/nav";
import { getCurrentProfile, ROLE_LABELS } from "@/lib/auth/get-profile";
import { getRecentNotifications } from "@/lib/notifications";
import { createClient } from "@/lib/supabase/server";
import { NewLessonModal } from "@/app/tutor/calendar/new-lesson-modal";

export default async function TutorLayout({ children }: { children: ReactNode }) {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const [notifications, { data: students }, { data: subjects }] = await Promise.all([
    profile ? getRecentNotifications(profile.id) : Promise.resolve([]),
    supabase.from("students").select("id, display_name").is("archived_at", null).order("display_name"),
    supabase.from("subjects").select("*").eq("active", true).order("name"),
  ]);

  return (
    <AppShell
      items={tutorNav}
      roleLabel={profile ? ROLE_LABELS[profile.role] : "מורה פרטי"}
      userName={profile?.full_name ?? profile?.email}
      profileHref="/tutor/profile"
      userId={profile?.id}
      notifications={notifications}
      quickAction={
        <NewLessonModal
          students={students ?? []}
          subjects={subjects ?? []}
          triggerClassName="px-3 py-1.5 text-xs"
        />
      }
    >
      {children}
    </AppShell>
  );
}
