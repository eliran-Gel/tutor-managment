import Link from "next/link";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LessonHistoryRow } from "@/components/lesson-history-row";
import { fetchLessonHistory } from "@/lib/lesson-history";
import { createClient } from "@/lib/supabase/server";

const PREVIEW_COUNT = 3;

export async function LessonHistoryCard({ studentId }: { studentId: string }) {
  const supabase = await createClient();
  const rows = await fetchLessonHistory(supabase, studentId);
  const preview = rows.slice(0, PREVIEW_COUNT);

  return (
    <Card>
      <CardHeader>
        <CardTitle>היסטוריית שיעורים</CardTitle>
        <Badge tone="neutral">{rows.length}</Badge>
      </CardHeader>

      {rows.length === 0 ? (
        <p className="text-sm text-text-muted">אין עדיין שיעורים לתלמיד/ה זה.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {preview.map((row) => (
            <LessonHistoryRow key={row.lessons.id} row={row} />
          ))}
        </div>
      )}

      {rows.length > 0 && (
        <Link
          href={`/tutor/students/${studentId}/history`}
          className="mt-3 inline-block text-sm font-medium text-brand-accent transition-transform duration-200 hover:underline active:scale-95"
        >
          לכל ההיסטוריה ←
        </Link>
      )}

      <p className="mt-4 text-xs text-text-muted">
        שיעורי בית וסיכומי שיעורים יופיעו כאן בהמשך, לאחר שהתכונות האלה ייבנו.
      </p>
    </Card>
  );
}
