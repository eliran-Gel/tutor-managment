import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { BusinessLinksForm } from "./business-links-form";
import { TutorSettingsForm } from "./tutor-settings-form";
import { SubjectsCard } from "./subjects-card";
import { CalendarFeedCard } from "./calendar-feed-card";
import { WorkingHoursCard } from "./working-hours-card";

export default async function SettingsPage() {
  const supabase = await createClient();

  const [{ data: links }, { data: settings }, { data: subjects }, { data: workingHours }] = await Promise.all([
    supabase.from("business_links").select("*").eq("id", true).single(),
    supabase.from("tutor_settings").select("*").eq("id", true).single(),
    supabase.from("subjects").select("*").order("name"),
    supabase.from("tutor_working_hours").select("*").order("day_of_week"),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold font-display text-text-primary">הגדרות</h1>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>קישורים חיצוניים</CardTitle>
          </CardHeader>
          <p className="mb-4 text-xs text-text-muted">
            הקישורים האלה גלויים לתלמידים ולהורים בדף הבית שלהם.
          </p>
          {links && <BusinessLinksForm links={links} />}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>הגדרות תפעוליות</CardTitle>
          </CardHeader>
          {settings && <TutorSettingsForm settings={settings} />}
        </Card>

        <SubjectsCard subjects={subjects ?? []} />

        <CalendarFeedCard token={process.env.TUTOR_CALENDAR_FEED_TOKEN ?? ""} />

        <WorkingHoursCard workingHours={workingHours ?? []} />

        <Card>
          <CardHeader>
            <CardTitle>חסימת שעות</CardTitle>
          </CardHeader>
          <p className="mb-4 text-xs text-text-muted">
            חריגות חד-פעמיות לשעות העבודה הרגילות - חופשה, פגישה, יום סגור.
          </p>
          <Link
            href="/tutor/availability"
            className="inline-block text-sm font-medium text-brand-accent transition-transform duration-200 hover:underline active:scale-90"
          >
            ניהול חסימות ←
          </Link>
        </Card>
      </div>
    </div>
  );
}
