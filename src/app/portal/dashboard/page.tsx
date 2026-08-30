import Link from "next/link";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { getSignedFileUrl } from "@/lib/lesson-files";
import { DELIVERY_MODE_LABELS } from "@/lib/lessons";
import { formatIsoDate, formatIsoDateWithWeekday } from "@/lib/dates/format";
import { getHebrewGreeting } from "@/lib/greeting";
import { RequestLessonModal } from "../lessons/request-lesson-modal";

export default async function PortalDashboardPage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile();

  const today = new Date().toISOString().slice(0, 10);

  const [
    { data: links },
    { data: nextLesson },
    { data: nextPendingLesson },
    { data: subjects },
    { data: ownStudent },
    { data: latestSummary },
    { count: openHomeworkCount },
  ] = await Promise.all([
      supabase.from("business_links").select("*").eq("id", true).single(),
      supabase
        .from("lessons")
        .select("*, subjects(name)")
        .eq("status", "confirmed")
        .gte("date", today)
        .order("date")
        .order("start_time")
        .limit(1)
        .maybeSingle(),
      // Only shown when there's no confirmed lesson yet - a request still
      // awaiting the tutor's decision, so the student isn't just staring
      // at "no lesson scheduled" while something is actually in progress.
      supabase
        .from("lessons")
        .select("*, subjects(name)")
        .eq("status", "requested")
        .gte("date", today)
        .order("date")
        .order("start_time")
        .limit(1)
        .maybeSingle(),
      supabase.from("subjects").select("*").eq("active", true).order("name"),
      profile?.role === "student"
        ? supabase.from("students").select("grade, school_name").eq("profile_id", profile.id).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase
        .from("lesson_files")
        .select("id, storage_path, lessons(date, subjects(name))")
        .ilike("mime_type", "image/%")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from("homework").select("id", { count: "exact", head: true }).eq("is_done", false),
    ]);

  const needsGradeSchool = ownStudent && (ownStudent.grade == null || !ownStudent.school_name);
  const latestSummaryUrl = latestSummary ? await getSignedFileUrl(latestSummary.storage_path) : null;

  const quickLinks = [
    { label: "אתר", href: links?.website_url },
    { label: "קהילה", href: links?.community_url },
    { label: "Bit", href: links?.bit_link },
    { label: "PayBox", href: links?.paybox_link },
  ].filter((l): l is { label: string; href: string } => Boolean(l.href));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold font-display text-text-primary">
          {getHebrewGreeting()}{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}! 👋
        </h1>
        <p className="text-sm text-text-secondary">כיף לראות אותך שוב</p>
      </div>

      {needsGradeSchool && (
        <Card className="border-status-pending bg-status-pending-bg">
          <p className="text-sm font-medium text-status-pending">
            כדאי להשלים את הפרופיל: יש להוסיף כיתה ובית ספר.
          </p>
          <Link
            href="/portal/profile"
            className="mt-2 inline-block text-sm font-semibold text-status-pending underline transition-transform duration-200 active:scale-90"
          >
            מעבר לפרופיל
          </Link>
        </Card>
      )}

      <Card className="bg-brand-primary text-white">
        <p className="text-sm opacity-80">השיעור הבא שלך</p>
        {nextLesson ? (
          <>
            <p className="mt-2 text-lg font-semibold">{nextLesson.subjects?.name ?? "שיעור"}</p>
            <p className="mt-1 text-sm opacity-90">
              {formatIsoDate(nextLesson.date)} · {nextLesson.start_time.slice(0, 5)}–
              {nextLesson.end_time.slice(0, 5)} · {DELIVERY_MODE_LABELS[nextLesson.delivery_mode]}
            </p>
          </>
        ) : nextPendingLesson ? (
          <>
            <p className="mt-2 text-lg font-semibold">{nextPendingLesson.subjects?.name ?? "שיעור"}</p>
            <p className="mt-1 text-sm opacity-90">
              {formatIsoDate(nextPendingLesson.date)} · {nextPendingLesson.start_time.slice(0, 5)}–
              {nextPendingLesson.end_time.slice(0, 5)}
            </p>
            <p className="mt-1 text-sm font-medium opacity-90">טרם אושר על ידי המורה</p>
          </>
        ) : (
          <p className="mt-2 text-lg font-semibold">עדיין אין שיעור מתוזמן</p>
        )}
        {profile?.role === "student" && (
          <div className="mt-4">
            <RequestLessonModal
              subjects={subjects ?? []}
              triggerClassName="bg-white/10 text-white hover:bg-white/20"
            />
          </div>
        )}
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/portal/summaries" className="block transition-transform duration-200 active:scale-95">
          <Card className="flex h-full items-center gap-3 transition-shadow hover:shadow-none">
            {latestSummaryUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={latestSummaryUrl} alt="" className="h-14 w-14 shrink-0 rounded-control border border-border object-cover" />
            ) : null}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text-primary">סיכום השיעור האחרון</p>
              {latestSummary?.lessons ? (
                <p className="mt-1 text-sm text-text-muted">
                  {latestSummary.lessons.subjects?.name ?? "שיעור"} · {formatIsoDateWithWeekday(latestSummary.lessons.date)}
                </p>
              ) : (
                <p className="mt-1 text-sm text-text-muted">אין עדיין סיכומים שפורסמו.</p>
              )}
            </div>
          </Card>
        </Link>
        <Link href="/portal/homework" className="block transition-transform duration-200 active:scale-95">
          <Card className="h-full transition-shadow hover:shadow-none">
            <p className="text-sm font-semibold text-text-primary">שיעורי בית</p>
            <p className="mt-2 text-sm text-text-muted">
              {openHomeworkCount ? `${openHomeworkCount} משימות פתוחות` : "אין משימות פתוחות כרגע."}
            </p>
          </Card>
        </Link>
      </div>

      {(links?.contact_info || quickLinks.length > 0) && (
        <Card>
          <p className="mb-3 text-sm font-semibold text-text-primary">יצירת קשר וקישורים</p>
          {links?.contact_info && (
            <p className="mb-3 text-sm text-text-secondary">{links.contact_info}</p>
          )}
          {quickLinks.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {quickLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-control border border-border px-3 py-1.5 text-sm font-medium text-text-secondary transition-transform duration-200 hover:bg-surface-muted hover:text-text-primary active:scale-90"
                >
                  {link.label}
                </a>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
