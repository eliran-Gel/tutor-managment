import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center gap-6 px-4 text-center">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">
          אלירן גלברג — מורה פרטי
        </h1>
        <p className="mt-2 text-text-secondary">מערכת ניהול לעסק ההוראה</p>
      </div>
      <Link href="/login">
        <Button>כניסה למערכת</Button>
      </Link>
    </main>
  );
}
