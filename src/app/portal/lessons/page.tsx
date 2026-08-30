import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { RequestLessonModal } from "./request-lesson-modal";
import { LessonsList } from "./lessons-list";
import { MyWaitlistSection } from "./my-waitlist-section";

export default async function PortalLessonsPage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile();

  const [{ data: lessons }, { data: subjects }, { data: waitlistEntries }] = await Promise.all([
    supabase
      .from("lessons")
      .select("*, subjects(name)")
      .order("date", { ascending: false })
      .order("start_time", { ascending: false }),
    supabase.from("subjects").select("*").eq("active", true).order("name"),
    // RLS scopes this to the caller's own entries only - a student never
    // sees anyone else's, or even how many others exist.
    supabase
      .from("waitlist_entries")
      .select("id, date, note, subjects(name)")
      .eq("status", "waiting")
      .order("created_at"),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold font-display text-text-primary">השיעורים שלי</h1>
          <p className="text-sm text-text-secondary">כל הבקשות והשיעורים המתוזמנים</p>
        </div>
        {profile?.role === "student" && <RequestLessonModal subjects={subjects ?? []} />}
      </div>

      {profile?.role !== "tutor" && <MyWaitlistSection entries={waitlistEntries ?? []} />}

      <LessonsList lessons={lessons ?? []} subjects={subjects ?? []} isTutor={profile?.role === "tutor"} />
    </div>
  );
}
