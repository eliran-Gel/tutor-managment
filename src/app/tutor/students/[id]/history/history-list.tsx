"use client";

import { useMemo, useState } from "react";
import { LessonHistoryRow } from "@/components/lesson-history-row";
import { LESSON_STATUS_LABELS, type LessonStatus } from "@/lib/lessons";
import type { LessonHistoryRow as LessonHistoryRowData } from "@/lib/lesson-history";
import {
  relativeMonthBucket,
  RELATIVE_MONTH_BUCKET_LABELS,
  type RelativeMonthBucket,
} from "@/lib/relative-month-buckets";
import { cn } from "@/lib/cn";

const BUCKET_ORDER: (RelativeMonthBucket | "all")[] = [
  "all",
  "future",
  "this_month",
  "last_month",
  "2_months_ago",
  "3_months_ago",
  "older",
];

const HEBREW_MONTHS = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
];

function monthLabel(isoDate: string) {
  const [year, month] = isoDate.split("-").map(Number);
  return `${HEBREW_MONTHS[month - 1]} ${year}`;
}

function toIsoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function HistoryList({ rows }: { rows: LessonHistoryRowData[] }) {
  const today = toIsoDate(new Date());
  const [statusFilter, setStatusFilter] = useState<LessonStatus | "all">("all");
  const [bucketFilter, setBucketFilter] = useState<RelativeMonthBucket | "all">("all");

  const statusesPresent = useMemo(
    () => Array.from(new Set(rows.map((r) => r.lessons.status))),
    [rows],
  );
  const bucketsPresent = useMemo(
    () => new Set(rows.map((r) => relativeMonthBucket(r.lessons.date))),
    [rows],
  );

  const filtered = rows
    .filter((r) => statusFilter === "all" || r.lessons.status === statusFilter)
    .filter((r) => bucketFilter === "all" || relativeMonthBucket(r.lessons.date) === bucketFilter);

  const groups = useMemo(() => {
    const map = new Map<string, LessonHistoryRowData[]>();
    for (const row of filtered) {
      const key = row.lessons.date.slice(0, 7); // YYYY-MM
      const list = map.get(key) ?? [];
      list.push(row);
      map.set(key, list);
    }
    return Array.from(map.entries()); // already in date-desc order since `filtered` is
  }, [filtered]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {BUCKET_ORDER.filter((b) => b === "all" || bucketsPresent.has(b)).map((bucket) => (
          <button
            key={bucket}
            type="button"
            onClick={() => setBucketFilter(bucket)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              bucketFilter === bucket
                ? "border-brand-accent bg-brand-accent text-white"
                : "border-border text-text-secondary hover:bg-surface-muted",
            )}
          >
            {bucket === "all" ? "כל התקופות" : RELATIVE_MONTH_BUCKET_LABELS[bucket]}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setStatusFilter("all")}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
            statusFilter === "all"
              ? "border-brand-accent bg-brand-accent text-white"
              : "border-border text-text-secondary hover:bg-surface-muted",
          )}
        >
          הכל ({rows.length})
        </button>
        {statusesPresent.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setStatusFilter(status)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              statusFilter === status
                ? "border-brand-accent bg-brand-accent text-white"
                : "border-border text-text-secondary hover:bg-surface-muted",
            )}
          >
            {LESSON_STATUS_LABELS[status]} ({rows.filter((r) => r.lessons.status === status).length})
          </button>
        ))}
      </div>

      {groups.length === 0 ? (
        <p className="text-sm text-text-muted">אין שיעורים התואמים את הסינון.</p>
      ) : (
        groups.map(([monthKey, monthRows]) => (
          <div key={monthKey} className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-text-secondary">{monthLabel(monthKey)}</h2>
            {monthRows.map((row) => (
              <LessonHistoryRow key={row.lessons.id} row={row} showCancelAction={row.lessons.date >= today} />
            ))}
          </div>
        ))
      )}
    </div>
  );
}
