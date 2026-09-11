import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatAppTime } from "@/lib/dates/timezone";
import { formatIsoDateWithWeekday } from "@/lib/dates/format";
import { AddBlockModal } from "./add-block-modal";
import { DeleteBlockButton } from "./delete-block-button";
import { AddAdditionModal } from "./add-addition-modal";
import { DeleteAdditionButton } from "./delete-addition-button";

export default async function AvailabilityPage() {
  const supabase = await createClient();
  const now = new Date().toISOString();
  const today = now.slice(0, 10);

  const [{ data: blocks }, { data: additions }] = await Promise.all([
    // A one-off block that already ended is never going to apply again -
    // no reason to keep showing it. A weekly-recurring one keeps applying
    // every week regardless of how long ago it started, so those always
    // stay visible.
    supabase
      .from("availability_blocks")
      .select("*")
      .or(`recurrence_rule.eq.weekly,end_at.gte.${now}`)
      .order("start_at"),
    supabase.from("availability_additions").select("*").gte("date", today).order("date"),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-xl font-bold font-display text-text-primary">חסימה/הוספת שעות</h1>

      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold font-display text-text-primary">חסימת שעות</h2>
            <p className="text-sm text-text-secondary">
              זמנים חסומים לא יופיעו כזמינים לבקשת שיעור מתלמידים.
            </p>
          </div>
          <AddBlockModal />
        </div>

        {blocks && blocks.length === 0 && (
          <Card>
            <p className="text-sm text-text-muted">אין חסימות זמן כרגע.</p>
          </Card>
        )}

        <div className="flex flex-col gap-2">
          {blocks?.map((block) => {
            const isAllDay =
              formatAppTime(block.start_at, "HH:mm") === "00:00" &&
              formatAppTime(block.end_at, "HH:mm") === "23:59";
            return (
              <Card key={block.id} className="min-w-0 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-text-primary">
                      {formatAppTime(block.start_at, "dd/MM/yyyy")} ·{" "}
                      {isAllDay
                        ? "כל היום"
                        : `${formatAppTime(block.start_at, "HH:mm")}–${formatAppTime(block.end_at, "HH:mm")}`}
                    </p>
                    {block.recurrence_rule === "weekly" && <Badge tone="selected">כל שבוע</Badge>}
                  </div>
                  {block.note && <p className="mt-1 break-words text-sm text-text-muted">{block.note}</p>}
                </div>
                <div className="shrink-0">
                  <DeleteBlockButton blockId={block.id} />
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-6 border-t border-border pt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold font-display text-text-primary">הוספת שעות חד-פעמית</h2>
            <p className="text-sm text-text-secondary">
              שעות מיוחדות לתאריך אחד בלבד, במקום ברירת המחדל הרגילה - בשבוע שאחריו חוזר לרגיל
              אוטומטית.
            </p>
          </div>
          <AddAdditionModal />
        </div>

        {additions && additions.length === 0 && (
          <Card>
            <p className="text-sm text-text-muted">אין הוספות שעות כרגע.</p>
          </Card>
        )}

        <div className="flex flex-col gap-2">
          {additions?.map((addition) => (
            <Card key={addition.id} className="min-w-0 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-text-primary">
                  {formatIsoDateWithWeekday(addition.date)} ·{" "}
                  {addition.start_time.slice(0, 5)}–{addition.end_time.slice(0, 5)}
                </p>
                {addition.note && <p className="mt-1 break-words text-sm text-text-muted">{addition.note}</p>}
              </div>
              <div className="shrink-0">
                <DeleteAdditionButton additionId={addition.id} />
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
