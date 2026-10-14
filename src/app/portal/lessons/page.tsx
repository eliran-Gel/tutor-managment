import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { getSelectedChild } from "@/lib/portal/get-selected-child";
import { RequestLessonModal } from "./request-lesson-modal";
import { LessonsList } from "./lessons-list";
import { MyWaitlistSection } from "./my-waitlist-section";
import { Card } from "@/components/ui/card";

export default async function PortalLessonsPage({
  searchParams,
}: {
  searchParams: Promise<{ child?: string }>;
}) {
  const supabase = await createClient();
  const profile = await getCurrentProfile();
  const { child: requestedChild } = await searchParams;
  const { current } = await getSelectedChild(supabase, profile, requestedChild);
  const childId = current?.id ?? null;

  const [{ data: lessonRows }, { data: requestedRows }, { data: subjects }, { data: waitlistEntries }] = await Promise.all([
    // Queried from lesson_participants (not lessons directly) so a parent
    // with more than one child sees only the selected child's lessons, not
    // every lesson RLS happens to let them see across all their kids.
    childId
      ? supabase
          .from("lesson_participants")
          .select("lessons!inner(*, subjects(name))")
          .eq("student_id", childId)
          .order("date", { referencedTable: "lessons", ascending: false })
          .order("start_time", { referencedTable: "lessons", ascending: false })
      : Promise.resolve({ data: [] }),
    // A lesson only gets a lesson_participants row once the tutor approves
    // it, so a request that's still pending (or was rejected) would never
    // show up in the query above - these are looked up by who they were
    // requested for instead.
    childId
      ? supabase.from("lessons").select("*, subjects(name)").eq("requested_student_id", childId)
      : Promise.resolve({ data: [] }),
    supabase.from("subjects").select("*").eq("active", true).order("name"),
    // Not per-child - a waitlist entry belongs to the parent's own account,
    // not to a specific one of their children (a pre-existing limitation,
    // unrelated to the selector added here).
    supabase
      .from("waitlist_entries")
      .select("id, date, note, subjects(name)")
      .eq("status", "waiting")
      .order("created_at"),
  ]);

  const byId = new Map<string, NonNullable<typeof requestedRows>[number]>();
  for (const l of [...(lessonRows ?? []).map((r) => r.lessons), ...(requestedRows ?? [])]) byId.set(l.id, l);
  const lessons = Array.from(byId.values()).sort((a, b) =>
    `${b.date}T${b.start_time}`.localeCompare(`${a.date}T${a.start_time}`),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold font-display text-text-primary">השיעורים שלי</h1>
          <p className="text-sm text-text-secondary">כל הבקשות והשיעורים המתוזמנים</p>
        </div>
        {(profile?.role === "student" || profile?.role === "parent") && current && (
          <RequestLessonModal subjects={subjects ?? []} studentId={current.id} />
        )}
      </div>

      {(profile?.role === "student" || profile?.role === "parent") && !current && (
        <Card className="border-status-pending bg-status-pending-bg">
          <p className="text-sm font-medium text-status-pending">
            {profile.role === "student"
              ? "החשבון שלך עדיין לא מקושר לרשומת תלמיד/ה. פנה/י למורה כדי לחבר את החשבון שלך מחדש."
              : "עדיין אין תלמיד/ה מקושר/ת לחשבון שלך. פנה/י למורה כדי לקשר את הילד/ה שלך."}
          </p>
        </Card>
      )}

      {profile?.role !== "tutor" && <MyWaitlistSection entries={waitlistEntries ?? []} />}

      <LessonsList lessons={lessons} subjects={subjects ?? []} isTutor={profile?.role === "tutor"} />
    </div>
  );
}
