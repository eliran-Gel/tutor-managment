import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { BusinessLinksForm } from "./business-links-form";
import { TutorSettingsForm } from "./tutor-settings-form";

export default async function SettingsPage() {
  const supabase = await createClient();

  const [{ data: links }, { data: settings }] = await Promise.all([
    supabase.from("business_links").select("*").eq("id", true).single(),
    supabase.from("tutor_settings").select("*").eq("id", true).single(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold text-text-primary">הגדרות</h1>

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
      </div>
    </div>
  );
}
