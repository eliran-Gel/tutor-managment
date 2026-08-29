import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentProfile, ROLE_LABELS } from "@/lib/auth/get-profile";
import { createClient } from "@/lib/supabase/server";
import { ChangePasswordForm } from "@/components/change-password-form";
import { EditNameForm } from "@/components/edit-name-form";
import { EditGradeSchoolForm } from "@/components/edit-grade-school-form";
import { NotificationSettingsCard } from "@/components/notification-settings-card";

export async function ProfilePageContent() {
  const profile = await getCurrentProfile();

  let ownStudent: { id: string; grade: number | null; grade_year: number | null; school_name: string | null } | null = null;
  if (profile?.role === "student") {
    const supabase = await createClient();
    const { data } = await supabase
      .from("students")
      .select("id, grade, grade_year, school_name")
      .eq("profile_id", profile.id)
      .maybeSingle();
    ownStudent = data;
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold text-text-primary">פרופיל</h1>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>פרטים אישיים</CardTitle>
        </CardHeader>
        <div className="flex flex-col gap-4">
          {profile && <EditNameForm userId={profile.id} currentName={profile.full_name} />}
          <div>
            <p className="text-xs text-text-muted">אימייל</p>
            <p className="text-sm font-medium text-text-primary">{profile?.email}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted">תפקיד</p>
            <p className="text-sm font-medium text-text-primary">
              {profile ? ROLE_LABELS[profile.role] : "—"}
            </p>
          </div>
        </div>
      </Card>

      {ownStudent && (
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>כיתה ובית ספר</CardTitle>
          </CardHeader>
          <EditGradeSchoolForm
            studentId={ownStudent.id}
            currentGrade={ownStudent.grade}
            currentGradeYear={ownStudent.grade_year}
            currentSchoolName={ownStudent.school_name}
          />
        </Card>
      )}

      <NotificationSettingsCard />

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>שינוי סיסמה</CardTitle>
        </CardHeader>
        <ChangePasswordForm />
      </Card>
    </div>
  );
}
