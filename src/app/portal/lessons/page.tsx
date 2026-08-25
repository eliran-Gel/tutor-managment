import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { RequestLessonModal } from "./request-lesson-modal";
import { LessonsList } from "./lessons-list";

export default async function PortalLessonsPage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile();

  const [{ data: lessons }, { data: subjects }] = await Promise.all([
    supabase
      .from("lessons")
      .select("*, subjects(name)")
      .order("date", { ascending: false })
      .order("start_time", { ascending: false }),
    supabase.from("subjects").select("*").eq("active", true).order("name"),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text-primary">השיעורים שלי</h1>
          <p className="text-sm text-text-secondary">כל הבקשות והשיעורים המתוזמנים</p>
        </div>
        {profile?.role === "student" && <RequestLessonModal subjects={subjects ?? []} />}
      </div>

      <LessonsList lessons={lessons ?? []} subjects={subjects ?? []} isTutor={profile?.role === "tutor"} />
    </div>
  );
}
