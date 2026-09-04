import Link from "next/link";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { getSelectedChild } from "@/lib/portal/get-selected-child";
import { getSignedFileUrl } from "@/lib/lesson-files";
import { DELIVERY_MODE_LABELS } from "@/lib/lessons";
import { formatIsoDate, formatIsoDateWithWeekday } from "@/lib/dates/format";
import { getHebrewGreeting } from "@/lib/greeting";
import { RequestLessonModal } from "../lessons/request-lesson-modal";
import { Reveal } from "@/components/reveal";

export default async function PortalDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ child?: string }>;
}) {
  const supabase = await createClient();
  const profile = await getCurrentProfile();
  const { child: requestedChild } = await searchParams;
  const { current } = await getSelectedChild(supabase, profile, requestedChild);

  const today = new Date().toISOString().slice(0, 10);
  const childId = current?.id ?? null;

  const [
    { data: links },
    { data: nextLessonRow },
    { data: nextPendingLessonRow },
    { data: subjects },
    { data: latestSummaryRow },
    { count: openHomeworkCount },
  ] = await Promise.all([
    supabase.from("business_links").select("*").eq("id", true).single(),
    childId
      ? supabase
          .from("lesson_participants")
          .select("lessons!inner(*, subjects(name))")
          .eq("student_id", childId)
          .eq("lessons.status", "confirmed")
          .gte("lessons.date", today)
          .order("date", { referencedTable: "lessons" })
          .order("start_time", { referencedTable: "lessons" })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    // Only shown when there's no confirmed lesson yet - a request still
    // awaiting the tutor's decision, so the student isn't just staring
    // at "no lesson scheduled" while something is actually in progress.
    childId
      ? supabase
          .from("lesson_participants")
          .select("lessons!inner(*, subjects(name))")
          .eq("student_id", childId)
          .eq("lessons.status", "requested")
          .gte("lessons.date", today)
          .order("date", { referencedTable: "lessons" })
          .order("start_time", { referencedTable: "lessons" })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("subjects").select("*").eq("active", true).order("name"),
    // lesson_files has no student_id of its own (it belongs to the lesson,
    // shared across every participant of a group lesson) - the double
    // embed is what lets this still ask "is my selected child one of this
    // lesson's participants".
    childId
      ? supabase
          .from("lesson_files")
          .select("id, storage_path, lessons!inner(date, subjects(name), lesson_participants!inner(student_id))")
          .ilike("mime_type", "image/%")
          .eq("lessons.lesson_participants.student_id", childId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    childId
      ? supabase.from("homework").select("id", { count: "exact", head: true }).eq("is_done", false).eq("student_id", childId)
      : Promise.resolve({ count: null }),
  ]);

  const nextLesson = nextLessonRow?.lessons ?? null;
  const nextPendingLesson = nextPendingLessonRow?.lessons ?? null;
  const needsGradeSchool =
    profile?.role === "student" && current && (current.grade == null || !current.school_name);
  const latestSummaryUrl = latestSummaryRow ? await getSignedFileUrl(latestSummaryRow.storage_path) : null;

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

      {profile?.role === "parent" && !current && (
        <Card className="border-status-pending bg-status-pending-bg">
          <p className="text-sm font-medium text-status-pending">
            עדיין אין תלמיד/ה מקושר/ת לחשבון שלך. פנה/י למורה כדי לקשר את הילד/ה שלך.
          </p>
        </Card>
      )}

      {needsGradeSchool && (
        <Reveal>
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
        </Reveal>
      )}

      <Reveal delay={0.05}>
        <Card className="bg-brand-primary text-white">
          <p className="text-sm opacity-80">השיעור הבא {profile?.role === "parent" ? `של ${current?.display_name ?? ""}` : "שלך"}</p>
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
      </Reveal>

      <div className="grid gap-4 md:grid-cols-2">
        <Reveal delay={0.1}>
          <Link href="/portal/summaries" className="block transition-transform duration-200 active:scale-95">
            <Card className="flex h-full items-center gap-3 transition-shadow hover:shadow-none">
              {latestSummaryUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={latestSummaryUrl} alt="" className="h-14 w-14 shrink-0 rounded-control border border-border object-cover" />
              ) : null}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-text-primary">סיכום השיעור האחרון</p>
                {latestSummaryRow?.lessons ? (
                  <p className="mt-1 text-sm text-text-muted">
                    {latestSummaryRow.lessons.subjects?.name ?? "שיעור"} · {formatIsoDateWithWeekday(latestSummaryRow.lessons.date)}
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-text-muted">אין עדיין סיכומים שפורסמו.</p>
                )}
              </div>
            </Card>
          </Link>
        </Reveal>
        <Reveal delay={0.15}>
          <Link href="/portal/homework" className="block transition-transform duration-200 active:scale-95">
            <Card className="h-full transition-shadow hover:shadow-none">
              <p className="text-sm font-semibold text-text-primary">שיעורי בית</p>
              <p className="mt-2 text-sm text-text-muted">
                {openHomeworkCount ? `${openHomeworkCount} משימות פתוחות` : "אין משימות פתוחות כרגע."}
              </p>
            </Card>
          </Link>
        </Reveal>
      </div>

      {(links?.contact_info || quickLinks.length > 0) && (
        <Reveal delay={0.2}>
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
        </Reveal>
      )}
    </div>
  );
}
