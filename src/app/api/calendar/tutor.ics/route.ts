import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fromAppTime } from "@/lib/dates/timezone";
import { buildIcsFeed, type IcsEvent } from "@/lib/ics";
import { DELIVERY_MODE_LABELS } from "@/lib/lessons";

// Public, unauthenticated endpoint (iOS/Google Calendar fetch it directly,
// with no login session) gated by a long random token instead of a
// Supabase session - the same "secret address" pattern Google Calendar
// itself uses for ICS subscriptions. Never log or expose this URL publicly.
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token || token !== process.env.TUTOR_CALENDAR_FEED_TOKEN) {
    return new Response("Not found", { status: 404 });
  }

  const supabase = createAdminClient();
  const { data: lessons } = await supabase
    .from("lessons")
    .select(
      "id, date, start_time, end_time, status, delivery_mode, topic, online_url, subjects(name), lesson_participants(payment_status, students(display_name))",
    )
    .in("status", ["confirmed", "completed"])
    .order("date");

  const events: IcsEvent[] = (lessons ?? []).map((lesson) => {
    const start = fromAppTime(new Date(`${lesson.date}T${lesson.start_time.slice(0, 5)}:00`));
    const end = fromAppTime(new Date(`${lesson.date}T${lesson.end_time.slice(0, 5)}:00`));
    const studentNames = lesson.lesson_participants
      .map((lp) => lp.students?.display_name)
      .filter((name): name is string => Boolean(name));
    const subjectName = lesson.subjects?.name ?? "שיעור";
    // Apple Calendar has no way to color a single event within a
    // subscribed ICS feed (color is set per-calendar, not per-event) -
    // the user's own suggestion after hearing that constraint was to mark
    // it in the title instead, so a fully-paid lesson (every participant,
    // relevant for group lessons too) gets a "שולם" prefix.
    const isFullyPaid =
      lesson.lesson_participants.length > 0 &&
      lesson.lesson_participants.every((lp) => lp.payment_status === "paid");
    const namePart = studentNames.length > 0 ? studentNames.join(", ") : subjectName;

    const descriptionParts = [subjectName, DELIVERY_MODE_LABELS[lesson.delivery_mode]];
    if (lesson.topic) descriptionParts.push(lesson.topic);

    return {
      uid: `lesson-${lesson.id}@tutor-managment`,
      start,
      end,
      summary: isFullyPaid ? `שולם · ${namePart}` : namePart,
      description: descriptionParts.join(" · "),
      location: lesson.delivery_mode === "online" ? (lesson.online_url ?? undefined) : undefined,
    };
  });

  const ics = buildIcsFeed("שיעורים - אלירן גלברג", events);

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="lessons.ics"',
      "Cache-Control": "no-store",
    },
  });
}
