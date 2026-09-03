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

// Explicit upload status instead of a single isPending boolean - a drop
// needs to visibly move through "picked up the file" -> "uploading" ->
// "done"/"failed", the same way WhatsApp Web shows a spinner-then-checkmark
// on a dropped image instead of just going quiet until it reappears in the
// chat.
type UploadStatus =
  | { phase: "idle" }
  | { phase: "uploading"; fileName: string }
  | { phase: "success"; fileName: string }
  | { phase: "error"; message: string };

// Any content the tutor wants to share about the lesson - a photo of the
// board, a worksheet, a slide deck. One upload flow, no artificial split
// between "summary" and "material": the accept list keeps the native iOS
// action sheet offering Photo Library / Take Photo / Choose Files together.
const ACCEPT = "image/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt";

export function LessonFilesSection({ lessonId, files }: { lessonId: string; files: FileRow[] }) {
  const [rowError, setRowError] = useState<string | null>(null);
  const [upload, setUpload] = useState<UploadStatus>({ phase: "idle" });
  const [isPending, startTransition] = useTransition();
  const [viewingFile, setViewingFile] = useState<FileRow | null>(null);
  // Drag counter, not a boolean: the card and everything inside it fires
  // dragenter/dragleave as the pointer crosses child element boundaries,
  // so a plain boolean flickers off mid-drag every time it passes over a
  // file row or button. Counting enter/leave pairs keeps it accurate.
  const [dragDepth, setDragDepth] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function uploadFile(file: File) {
    setUpload({ phase: "uploading", fileName: file.name });
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
        setUpload({
          phase: "error",
          message: "error" in ticket && ticket.error ? ticket.error : "לא ניתן היה להתחיל את ההעלאה",
        });
        return;
      }

      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from("lesson-files")
        .uploadToSignedUrl(storagePath, token, file);
      if (uploadError) {
        setUpload({ phase: "error", message: uploadError.message });
        return;
      }

      const result = await confirmLessonFileUpload(lessonId, storagePath, file.name, file.type);
      if ("error" in result && result.error) {
        setUpload({ phase: "error", message: result.error });
        return;
      }

      setUpload({ phase: "success", fileName: file.name });
      // Auto-clear the success banner after a moment, WhatsApp-style -
      // the checkmark doesn't sit there forever, but it does show up first.
      setTimeout(() => {
        setUpload((current) => (current.phase === "success" ? { phase: "idle" } : current));
      }, 3000);
    } catch {
      setUpload({ phase: "error", message: "ההעלאה נכשלה - נסה/י שוב, ייתכן שהחיבור לאינטרנט לא יציב." });
    }
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    startTransition(() => uploadFile(file));
  }

  // A file dragged from Finder/Explorer or Photos lands directly in
  // dataTransfer.files. A photo dragged from a *webpage* in another tab
  // (Google Images, WhatsApp Web itself, etc.) usually doesn't - the
  // browser only hands over the image's URL, and it's on us to fetch the
  // actual bytes, the same trick sites like this one are being asked to
  // imitate rely on internally.
  async function extractDroppedFile(e: DragEvent<HTMLDivElement>): Promise<File | null> {
    const files = e.dataTransfer.files;
    if (files && files.length > 0) return files[0];

    const html = e.dataTransfer.getData("text/html");
    let url = e.dataTransfer.getData("text/uri-list") || e.dataTransfer.getData("URL");
    if (!url && html) {
      const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (match) url = match[1];
    }
    if (!url || !/^https?:\/\//i.test(url)) return null;

    const res = await fetch(url);
    if (!res.ok) throw new Error("download-failed");
    const blob = await res.blob();
    const name = decodeURIComponent(url.split("/").pop()?.split("?")[0] || "image") || "image";
    return new File([blob], name, { type: blob.type || "image/jpeg" });
  }

  function handleDragEnter(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const types = e.dataTransfer.types;
    if (types.includes("Files") || types.includes("text/uri-list")) setDragDepth((d) => d + 1);
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
    startTransition(async () => {
      let file: File | null;
      try {
        file = await extractDroppedFile(e);
      } catch {
        setUpload({
          phase: "error",
          message: "לא הצלחתי להוריד את התמונה מהמקור הזה - כנראה שהאתר לא מאפשר זאת. שמרו אותה למחשב (קליק ימני ← שמירת תמונה) ואז גררו אותה מהתיקייה.",
        });
        return;
      }
      if (!file) {
        setUpload({ phase: "error", message: "לא זיהיתי קובץ בגרירה הזו. נסו לגרור תמונה או קובץ מהמחשב." });
        return;
      }
      await uploadFile(file);
    });
  }

  const isBusy = isPending || upload.phase === "uploading";

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
        "relative rounded-card transition-shadow duration-150",
        dragDepth > 0 && "ring-2 ring-brand-accent ring-offset-2 ring-offset-background",
      )}
    >
      {dragDepth > 0 && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-card bg-brand-accent/10 backdrop-blur-[1px]">
          <span className="rounded-full border border-brand-accent bg-surface px-4 py-2 text-sm font-semibold text-brand-accent shadow-card">
            שחררו כאן להעלאה 📎
          </span>
        </div>
      )}
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
                    disabled={isBusy}
                    onClick={() =>
                      startTransition(async () => {
                        try {
                          await toggleFileVisibility(f.id, !f.visible_to_students, lessonId);
                        } catch {
                          setRowError("הפעולה נכשלה - נסה/י שוב.");
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
                    disabled={isBusy}
                    onClick={() =>
                      startTransition(async () => {
                        try {
                          await deleteLessonFile(f.id, f.storage_path, lessonId);
                        } catch {
                          setRowError("הפעולה נכשלה - נסה/י שוב.");
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
          <Button type="button" disabled={isBusy} onClick={() => fileInputRef.current?.click()}>
            {isBusy ? "מעלה..." : "העלאת תוכן"}
          </Button>
          <p className="text-xs text-text-muted">או גררו קובץ/תמונה לכאן</p>

          <div className="w-full" aria-live="polite">
            {upload.phase === "uploading" && (
              <p className="flex items-center gap-2 text-sm text-text-secondary">
                <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-border border-t-brand-accent" />
                מעלה את &quot;{upload.fileName}&quot;...
              </p>
            )}
            {upload.phase === "success" && (
              <p className="flex items-center gap-2 text-sm font-medium text-status-confirmed">
                <span aria-hidden>✓</span> הועלה בהצלחה: &quot;{upload.fileName}&quot;
              </p>
            )}
            {upload.phase === "error" && (
              <p className="text-sm text-status-destructive">{upload.message}</p>
            )}
            {rowError && <p className="text-sm text-status-destructive">{rowError}</p>}
          </div>
        </div>

        <FileViewerModal file={viewingFile} onClose={() => setViewingFile(null)} />
      </Card>
    </div>
  );
}
