import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatAppTime } from "@/lib/dates/timezone";
import { AddBlockModal } from "./add-block-modal";
import { DeleteBlockButton } from "./delete-block-button";

export default async function AvailabilityPage() {
  const supabase = await createClient();
  const { data: blocks } = await supabase
    .from("availability_blocks")
    .select("*")
    .order("start_at");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">חסימת שעות</h1>
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
        {blocks?.map((block) => (
          <Card key={block.id} className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium text-text-primary">
                  {formatAppTime(block.start_at, "dd/MM/yyyy")} ·{" "}
                  {formatAppTime(block.start_at, "HH:mm")}–{formatAppTime(block.end_at, "HH:mm")}
                </p>
                {block.recurrence_rule === "weekly" && <Badge tone="selected">כל שבוע</Badge>}
              </div>
              {block.note && <p className="mt-1 text-sm text-text-muted">{block.note}</p>}
            </div>
            <DeleteBlockButton blockId={block.id} />
          </Card>
        ))}
      </div>
    </div>
  );
}
