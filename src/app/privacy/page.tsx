import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "מדיניות פרטיות",
};

const sections: { title: string; body: string[] }[] = [
  {
    title: "מי אנחנו",
    body: [
      "המערכת מופעלת על ידי אלירן גלברג, מורה פרטי, לצורך ניהול שיעורים פרטיים: קביעת שיעורים, מעקב תשלומים, שיעורי בית וסיכומי שיעור.",
    ],
  },
  {
    title: "איזה מידע נשמר",
    body: [
      "פרטי חשבון: שם, כתובת אימייל, ובמידה שהוזן - טלפון, כיתה ובית ספר.",
      "פרטי שיעורים: תאריכים ושעות, מקצוע, נושא, מחיר, סטטוס תשלום, שיעורי בית, ציונים שהוזנו, סיכומי שיעור וקבצים שהועלו.",
      "הגדרות התראות: אם אישרת קבלת התראות בטלפון, נשמר מזהה טכני של המכשיר לצורך שליחתן.",
      "המורה שומר גם הערות פנימיות על תלמידים לצורך ההוראה. הערות אלה אינן נראות לתלמידים או להורים.",
    ],
  },
  {
    title: "למה משתמשים במידע",
    body: [
      "רק לצורך מתן השיעורים וניהולם: תיאום, תזכורות, מעקב תשלומים ושיתוף חומרי לימוד. המידע לא נמכר ולא משמש לפרסום.",
    ],
  },
  {
    title: "מי רואה את המידע",
    body: [
      "המורה רואה את כל המידע. תלמיד רואה רק את המידע שלו, והורה רואה רק את המידע של ילדיו המקושרים לחשבונו.",
      "המידע מאוחסן אצל ספקי תשתית שמשמשים להפעלת האתר: Supabase (מסד נתונים והתחברות) ו-Vercel (אחסון האתר). אם נכנסים עם חשבון Google, ההזדהות מתבצעת מול Google. ייתכן שימוש בכלי בינה מלאכותית לניסוח טיוטות של סיכומי שיעור, והמורה בודק ומאשר אותן לפני שהן מוצגות.",
    ],
  },
  {
    title: "קטינים",
    body: [
      "השימוש במערכת על ידי קטינים נעשה בידיעת הוריהם. הורה שמעוניין לראות או לבקש מחיקה של מידע על ילדו מוזמן לפנות למורה.",
    ],
  },
  {
    title: "עוגיות",
    body: ["נעשה שימוש רק בעוגיות הנחוצות להתחברות לחשבון ולשמירת מצב התצוגה (בהיר/כהה). אין עוגיות פרסום או מעקב."],
  },
  {
    title: "מחיקת מידע ויצירת קשר",
    body: [
      "אפשר לבקש בכל עת לראות, לתקן או למחוק את המידע שנשמר עליך, או למחוק את החשבון כולו. לפניות: אלירן גלברג, 058-6053334 (גם בוואטסאפ).",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12">
      <Link href="/login" className="text-sm font-medium text-brand-accent hover:underline">
        ← חזרה
      </Link>
      <h1 className="mt-4 text-2xl font-bold font-display text-text-primary">מדיניות פרטיות</h1>
      <p className="mt-1 text-sm text-text-muted">עודכן לאחרונה: אוקטובר 2026</p>

      <div className="mt-8 flex flex-col gap-6">
        {sections.map((section) => (
          <section key={section.title}>
            <h2 className="text-base font-semibold text-text-primary">{section.title}</h2>
            <div className="mt-2 flex flex-col gap-2">
              {section.body.map((paragraph) => (
                <p key={paragraph} className="text-sm leading-relaxed text-text-secondary">
                  {paragraph}
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
