"use client";

import { useRef, useState, useTransition, type ChangeEvent } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { uploadLessonFile, deleteLessonFile, toggleFileVisibility } from "./actions";

type FileRow = {
  id: string;
  file_name: string;
  storage_path: string;
  mime_type: string;
  visible_to_students: boolean;
  signedUrl: string | null;
};

// Any content the tutor wants to share about the lesson - a photo of the
// board, a worksheet, a slide deck. One upload flow, no artificial split
// between "summary" and "material": the accept list keeps the native iOS
// action sheet offering Photo Library / Take Photo / Choose Files together.
const ACCEPT = "image/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt";

export function LessonFilesSection({ lessonId, files }: { lessonId: string; files: FileRow[] }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    const formData = new FormData();
    formData.set("file", file);
    startTransition(async () => {
      const result = await uploadLessonFile(lessonId, formData);
      if ("error" in result && result.error) setError(result.error);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>תוכן השיעור</CardTitle>
      </CardHeader>

      {files.length === 0 ? (
        <p className="text-sm text-text-muted">עדיין לא הועלה תוכן לשיעור הזה.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {files.map((f) => {
            const isImage = f.mime_type.startsWith("image/");
            return (
              <div key={f.id} className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-border px-3 py-2">
                <div className="flex min-w-0 items-center gap-3">
                  {isImage && f.signedUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={f.signedUrl}
                      alt={f.file_name}
                      className="h-12 w-12 shrink-0 rounded-control border border-border object-cover"
                    />
                  ) : (
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-control border border-border bg-surface-muted text-xs text-text-muted">
                      קובץ
                    </span>
                  )}
                  <div className="min-w-0">
                    {f.signedUrl ? (
                      <a
                        href={f.signedUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="truncate text-sm font-medium text-brand-accent hover:underline"
                      >
                        {f.file_name}
                      </a>
                    ) : (
                      <span className="truncate text-sm text-text-muted">{f.file_name}</span>
                    )}
                    <div className="mt-0.5">
                      <Badge tone={f.visible_to_students ? "confirmed" : "neutral"}>
                        {f.visible_to_students ? "גלוי לתלמיד/ה" : "מוסתר"}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    className="text-xs"
                    disabled={isPending}
                    onClick={() =>
                      startTransition(async () => {
                        await toggleFileVisibility(f.id, !f.visible_to_students, lessonId);
                      })
                    }
                  >
                    {f.visible_to_students ? "הסתרה" : "הצגה"}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="text-xs"
                    disabled={isPending}
                    onClick={() =>
                      startTransition(async () => {
                        await deleteLessonFile(f.id, f.storage_path, lessonId);
                      })
                    }
                  >
                    מחיקה
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-4">
        <input ref={fileInputRef} type="file" accept={ACCEPT} onChange={handleFileChange} className="hidden" />
        <Button type="button" disabled={isPending} onClick={() => fileInputRef.current?.click()}>
          {isPending ? "מעלה..." : "העלאת תוכן"}
        </Button>
        {error && <p className="text-sm text-status-destructive">{error}</p>}
      </div>
    </Card>
  );
}
