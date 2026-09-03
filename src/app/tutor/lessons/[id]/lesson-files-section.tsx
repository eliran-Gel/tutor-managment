"use client";

import { useRef, useState, useTransition, type ChangeEvent, type DragEvent } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { FileViewerModal } from "@/components/file-viewer-modal";
import { createUploadTicket, confirmLessonFileUpload, deleteLessonFile, toggleFileVisibility } from "./actions";

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
  const [viewingFile, setViewingFile] = useState<FileRow | null>(null);
  // Drag counter, not a boolean: the card and everything inside it fires
  // dragenter/dragleave as the pointer crosses child element boundaries,
  // so a plain boolean flickers off mid-drag every time it passes over a
  // file row or button. Counting enter/leave pairs keeps it accurate.
  const [dragDepth, setDragDepth] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function uploadFile(file: File) {
    setError(null);
    try {
      // File bytes never touch our own server - they'd have to pass
      // through Vercel's function boundary, which hard-caps request
      // bodies at 4.5MB regardless of any app-level setting (a real
      // phone photo blows past that easily). The ticket below is
      // authorized here, then the browser uploads straight to Storage.
      const ticket = await createUploadTicket(lessonId, file.name, file.size);
      const storagePath = "storagePath" in ticket ? ticket.storagePath : undefined;
      const token = "token" in ticket ? ticket.token : undefined;
      if (!storagePath || !token) {
        setError("error" in ticket && ticket.error ? ticket.error : "לא ניתן היה להתחיל את ההעלאה");
        return;
      }

      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from("lesson-files")
        .uploadToSignedUrl(storagePath, token, file);
      if (uploadError) {
        setError(uploadError.message);
        return;
      }

      const result = await confirmLessonFileUpload(lessonId, storagePath, file.name, file.type);
      if ("error" in result && result.error) setError(result.error);
    } catch {
      setError("ההעלאה נכשלה - נסה/י שוב, ייתכן שהחיבור לאינטרנט לא יציב.");
    }
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    startTransition(() => uploadFile(file));
  }

  // Drag-and-drop a file straight onto the card - from the Finder/Explorer,
  // from Photos, or from an image open in another browser tab - the same
  // way you'd drop a photo into a WhatsApp Web chat, instead of only ever
  // going through the native file picker.
  function handleDragEnter(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (e.dataTransfer.types.includes("Files")) setDragDepth((d) => d + 1);
  }
  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
  }
  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragDepth((d) => Math.max(0, d - 1));
  }
  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragDepth(0);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    startTransition(() => uploadFile(file));
  }

  return (
    // Drag state is shown via an outer ring (box-shadow), not by editing
    // Card's own border/background classes - this repo's cn() is a plain
    // join, not tailwind-merge, so a same-property override here would
    // silently lose to Card's own classes depending on Tailwind's
    // generated source order, not which one "looks like" it should win.
    <div
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "rounded-card transition-shadow duration-150",
        dragDepth > 0 && "ring-2 ring-brand-accent ring-offset-2 ring-offset-background",
      )}
    >
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
                    <button type="button" onClick={() => setViewingFile(f)} className="shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={f.signedUrl}
                        alt={f.file_name}
                        className="h-12 w-12 rounded-control border border-border object-cover"
                      />
                    </button>
                  ) : (
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-control border border-border bg-surface-muted text-xs text-text-muted">
                      קובץ
                    </span>
                  )}
                  <div className="min-w-0">
                    {f.signedUrl ? (
                      <button
                        type="button"
                        onClick={() => setViewingFile(f)}
                        className="truncate text-sm font-medium text-brand-accent hover:underline"
                      >
                        {f.file_name}
                      </button>
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
                        try {
                          await toggleFileVisibility(f.id, !f.visible_to_students, lessonId);
                        } catch {
                          setError("הפעולה נכשלה - נסה/י שוב.");
                        }
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
                        try {
                          await deleteLessonFile(f.id, f.storage_path, lessonId);
                        } catch {
                          setError("הפעולה נכשלה - נסה/י שוב.");
                        }
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
          <p className="text-xs text-text-muted">או גררו קובץ/תמונה לכאן</p>
          {error && <p className="w-full text-sm text-status-destructive">{error}</p>}
        </div>

        <FileViewerModal file={viewingFile} onClose={() => setViewingFile(null)} />
      </Card>
    </div>
  );
}
