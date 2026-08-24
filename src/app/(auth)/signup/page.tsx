import { SignupForm } from "./signup-form";

export default function SignupPage() {
  const isConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  return (
    <main className="flex min-h-full flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm rounded-card border border-border bg-surface p-8 shadow-card">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold text-text-primary">הרשמה למערכת</h1>
          <p className="mt-1 text-sm text-text-secondary">
            אלירן גלברג - מורה פרטי
          </p>
        </div>

        {isConfigured ? (
          <SignupForm />
        ) : (
          <p className="rounded-control bg-status-pending-bg px-4 py-3 text-sm text-status-pending">
            החיבור ל-Supabase עדיין לא הוגדר. הוסיפו את משתני הסביבה בקובץ{" "}
            <code dir="ltr">.env.local</code> כדי להפעיל הרשמה.
          </p>
        )}
      </div>
    </main>
  );
}
