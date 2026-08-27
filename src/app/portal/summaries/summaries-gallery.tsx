"use client";

import { useState } from "react";
import { FileViewerModal, type ViewableFile } from "@/components/file-viewer-modal";
import { formatIsoDateWithWeekday } from "@/lib/dates/format";

type SummaryItem = ViewableFile & {
  id: string;
  lessons: { date: string; subjects: { name: string } | null } | null;
};

export function SummariesGallery({ summaries }: { summaries: SummaryItem[] }) {
  const [viewingFile, setViewingFile] = useState<ViewableFile | null>(null);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {summaries.map((s) => (
        <div key={s.id} className="flex flex-col gap-1.5">
          {s.signedUrl ? (
            <button type="button" onClick={() => setViewingFile(s)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={s.signedUrl}
                alt={s.file_name}
                className="aspect-square w-full rounded-control border border-border object-cover"
              />
            </button>
          ) : (
            <div className="flex aspect-square w-full items-center justify-center rounded-control border border-border bg-surface-muted text-xs text-text-muted">
              שגיאה בטעינה
            </div>
          )}
          {s.lessons && (
            <p className="truncate text-xs text-text-muted">
              {s.lessons.subjects?.name ?? "שיעור"} · {formatIsoDateWithWeekday(s.lessons.date)}
            </p>
          )}
        </div>
      ))}

      <FileViewerModal file={viewingFile} onClose={() => setViewingFile(null)} />
    </div>
  );
}
