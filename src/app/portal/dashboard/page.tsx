import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export default async function PortalDashboardPage() {
  const supabase = await createClient();
  const { data: links } = await supabase.from("business_links").select("*").eq("id", true).single();

  const quickLinks = [
    { label: "אתר", href: links?.website_url },
    { label: "קהילה", href: links?.community_url },
    { label: "Bit", href: links?.bit_link },
    { label: "PayBox", href: links?.paybox_link },
  ].filter((l): l is { label: string; href: string } => Boolean(l.href));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-text-primary">שלום! 👋</h1>
        <p className="text-sm text-text-secondary">כיף לראות אותך שוב</p>
      </div>

      <Card className="bg-brand-primary text-white">
        <p className="text-sm opacity-80">השיעור הבא שלך</p>
        <p className="mt-2 text-lg font-semibold">עדיין אין שיעור מתוזמן</p>
        <Button variant="secondary" className="mt-4 bg-white/10 text-white hover:bg-white/20">
          קביעת שיעור
        </Button>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <p className="text-sm font-semibold text-text-primary">סיכום השיעור האחרון</p>
          <p className="mt-2 text-sm text-text-muted">אין עדיין סיכומים שפורסמו.</p>
        </Card>
        <Card>
          <p className="text-sm font-semibold text-text-primary">שיעורי בית</p>
          <p className="mt-2 text-sm text-text-muted">אין משימות פתוחות כרגע.</p>
        </Card>
      </div>

      {(links?.contact_info || quickLinks.length > 0) && (
        <Card>
          <p className="mb-3 text-sm font-semibold text-text-primary">יצירת קשר וקישורים</p>
          {links?.contact_info && (
            <p className="mb-3 text-sm text-text-secondary">{links.contact_info}</p>
          )}
          {quickLinks.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {quickLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-control border border-border px-3 py-1.5 text-sm font-medium text-text-secondary hover:bg-surface-muted hover:text-text-primary"
                >
                  {link.label}
                </a>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
