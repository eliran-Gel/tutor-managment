import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";

const structuredData = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "אלירן גלברג",
  jobTitle: "מורה פרטי",
  url: "https://elirangelberg.com",
  knowsAbout: ["מתמטיקה", "פיזיקה", "מחשבים"],
};

export default function HomePage() {
  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center gap-6 px-4 text-center">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <div>
        <h1 className="text-2xl font-bold text-text-primary">
          אלירן גלברג — מורה פרטי
        </h1>
        <p className="mt-2 text-text-secondary">מורה פרטי למתמטיקה, פיזיקה ומחשבים</p>
      </div>
      <Link href="/login" className={buttonClasses()}>
        כניסה למערכת
      </Link>
    </main>
  );
}
