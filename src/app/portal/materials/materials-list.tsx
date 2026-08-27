"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { FileViewerModal, type ViewableFile } from "@/components/file-viewer-modal";
import { formatIsoDateWithWeekday } from "@/lib/dates/format";

type MaterialItem = ViewableFile & {
  id: string;
  lessons: { date: string; subjects: { name: string } | null } | null;
};

export function MaterialsList({ materials }: { materials: MaterialItem[] }) {
  const [viewingFile, setViewingFile] = useState<ViewableFile | null>(null);

  return (
    <div className="flex flex-col gap-2">
      {materials.map((m) => (
        <Card key={m.id} className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            {m.signedUrl ? (
              <button
                type="button"
                onClick={() => setViewingFile(m)}
                className="truncate text-sm font-medium text-brand-accent hover:underline"
              >
                {m.file_name}
              </button>
            ) : (
              <span className="truncate text-sm text-text-muted">{m.file_name}</span>
            )}
            {m.lessons && (
              <p className="mt-0.5 truncate text-xs text-text-muted">
                {m.lessons.subjects?.name ?? "שיעור"} · {formatIsoDateWithWeekday(m.lessons.date)}
              </p>
            )}
          </div>
        </Card>
      ))}

      <FileViewerModal file={viewingFile} onClose={() => setViewingFile(null)} />
    </div>
  );
}
