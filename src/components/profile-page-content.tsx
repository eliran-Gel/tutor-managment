import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentProfile, ROLE_LABELS } from "@/lib/auth/get-profile";
import { ChangePasswordForm } from "@/components/change-password-form";
import { EditNameForm } from "@/components/edit-name-form";

export async function ProfilePageContent() {
  const profile = await getCurrentProfile();

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

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>שינוי סיסמה</CardTitle>
        </CardHeader>
        <ChangePasswordForm />
      </Card>
    </div>
  );
}
