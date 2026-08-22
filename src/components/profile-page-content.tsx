import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentProfile, ROLE_LABELS } from "@/lib/auth/get-profile";
import { ChangePasswordForm } from "@/components/change-password-form";

export async function ProfilePageContent() {
  const profile = await getCurrentProfile();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold text-text-primary">פרופיל</h1>

      <Card className="max-w-md">
        <dl className="flex flex-col gap-4">
          <div>
            <dt className="text-xs text-text-muted">שם מלא</dt>
            <dd className="text-sm font-medium text-text-primary">
              {profile?.full_name ?? "לא הוגדר"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-text-muted">אימייל</dt>
            <dd className="text-sm font-medium text-text-primary">{profile?.email}</dd>
          </div>
          <div>
            <dt className="text-xs text-text-muted">תפקיד</dt>
            <dd className="text-sm font-medium text-text-primary">
              {profile ? ROLE_LABELS[profile.role] : "—"}
            </dd>
          </div>
        </dl>
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
