"use client";

import { Button } from "@/components/ui/button";
import { PAYMENT_METHOD_LABELS, LESSON_STATUS_LABELS } from "@/lib/lessons";
import type { Database } from "@/types/database";

export type ExportRow = {
  date: string | null;
  subject_name: string | null;
  student_name: string | null;
  duration_minutes: number | null;
  status: Database["public"]["Enums"]["lesson_status"] | null;
  price_charged: number | null;
  payment_status: Database["public"]["Enums"]["payment_status"] | null;
  payment_method: Database["public"]["Enums"]["payment_method"] | null;
  payment_received_at: string | null;
};

const HEADERS = [
  "תאריך",
  "מקצוע",
  "תלמיד/ה",
  "משך (דקות)",
  "סטטוס שיעור",
  "מחיר",
  "סטטוס תשלום",
  "אמצעי תשלום",
  "תאריך קבלת תשלום",
];

/** Wraps a value so commas/quotes/newlines inside it can't break the column
 * layout - a student name with a comma in it would otherwise silently shift
 * every following column by one. */
function csvCell(value: string | number | null | undefined) {
  const s = value === null || value === undefined ? "" : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

export function ExportButton({ rows, periodLabel }: { rows: ExportRow[]; periodLabel: string }) {
  function download() {
    const lines = [
      HEADERS.map(csvCell).join(","),
      ...rows.map((r) =>
        [
          csvCell(r.date),
          csvCell(r.subject_name ?? "ללא מקצוע"),
          csvCell(r.student_name ?? ""),
          csvCell(r.duration_minutes),
          csvCell(r.status ? LESSON_STATUS_LABELS[r.status] : ""),
          csvCell(r.price_charged ?? 0),
          csvCell(r.payment_status === "paid" ? "שולם" : "לא שולם"),
          csvCell(r.payment_method ? PAYMENT_METHOD_LABELS[r.payment_method] : ""),
          csvCell(r.payment_received_at ? r.payment_received_at.slice(0, 10) : ""),
        ].join(","),
      ),
    ];

    // The leading BOM is not optional: without it Excel reads the file as
    // the local codepage and every Hebrew field opens as gibberish.
    // (Verified on the raw bytes - Blob.text() strips a BOM on decode, so
    // checking the decoded string makes it look absent when it isn't.)
    const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `הכנסות-${periodLabel}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <Button type="button" variant="secondary" className="text-sm" disabled={rows.length === 0} onClick={download}>
      ייצוא לאקסל ({rows.length})
    </Button>
  );
}
