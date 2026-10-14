"use client";

import { useRef, useState, useTransition, type ChangeEvent } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { FileViewerModal } from "@/components/file-viewer-modal";
import {
  addStudentFile,
  createStudentFileTicket,
  deleteStudentFile,
  toggleStudentFileVisibility,
} from "./student-files-actions";

type FileRow = {
  id: string;
  file_name: string;
  storage_path: string;
  mime_type: string;
  visible_to_students: boolean;
  signedUrl: string | null;
};

type UploadStatus =
  | { phase: "idle" }
  | { phase: "uploading"; fileName: string }
  | { phase: "success"; fileName: string }
  | { phase: "error"; message: string };

const ACCEPT = "image/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt";

/** Materials shared with this student (and their parents) permanently -
 * not tied to any lesson, unlike the lesson page's own file section. */
export function StudentFilesCard({ studentId, files }: { studentId: string; files: FileRow[] }) {
  const [upload, setUpload] = useState<UploadStatus>({ phase: "idle" });
  const [rowError, setRowError] = useState<string | null>(null);
  const [viewingIndex, setViewingIndex] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function uploadFile(file: File) {
    setUpload({ phase: "uploading", fileName: file.name });
    try {
      const ticket = await createStudentFileTicket(studentId, file.name, file.size);
      const storagePath = "storagePath" in ticket ? ticket.storagePath : undefined;
      const token = "token" in ticket ? ticket.token : undefined;
      if (!storagePath || !token) {
        setUpload({
          phase: "error",
          message: "error" in ticket && ticket.error ? ticket.error : "לא ניתן היה להתחיל את ההעלאה",
        });
        return;
      }

      const { error: uploadError } = await createClient().storage
        .from("lesson-files")
        .uploadToSignedUrl(storagePath, token, file);
      if (uploadError) {
        setUpload({ phase: "error", message: uploadError.message });
        return;
      }

      const result = await addStudentFile(studentId, storagePath, file.name, file.type);
      if ("error" in result && result.error) {
        setUpload({ phase: "error", message: result.error });
        return;
      }

      setUpload({ phase: "success", fileName: file.name });
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

  const isBusy = isPending || upload.phase === "uploading";

  return (
    <Card>
      <CardHeader>
        <CardTitle>חומרי עזר לתלמיד/ה</CardTitle>
      </CardHeader>
      <p className="mb-4 text-sm text-text-muted">
        קבצים שיופיעו תמיד בעמוד &quot;חומרי עזר&quot; של התלמיד/ה (וההורים), בלי קשר לשיעור מסוים.
      </p>

      {files.length === 0 ? (
        <p className="text-sm text-text-muted">עדיין לא הועלו חומרי עזר לתלמיד/ה הזה.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {files.map((f, i) => (
            <div
              key={f.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-border px-3 py-2"
            >
              <div className="min-w-0">
                {f.signedUrl ? (
                  <button
                    type="button"
                    onClick={() => setViewingIndex(i)}
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
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="text-xs"
                  disabled={isBusy}
                  onClick={() =>
                    startTransition(async () => {
                      setRowError(null);
                      const result = await toggleStudentFileVisibility(f.id, !f.visible_to_students, studentId);
                      if ("error" in result && result.error) setRowError("הפעולה נכשלה - נסה/י שוב.");
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
                      setRowError(null);
                      const result = await deleteStudentFile(f.id, f.storage_path, studentId);
                      if ("error" in result && result.error) setRowError("הפעולה נכשלה - נסה/י שוב.");
                    })
                  }
                >
                  מחיקה
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-4">
        <input ref={fileInputRef} type="file" accept={ACCEPT} onChange={handleFileChange} className="hidden" />
        <Button type="button" disabled={isBusy} onClick={() => fileInputRef.current?.click()}>
          {isBusy ? "מעלה..." : "העלאת חומר עזר"}
        </Button>

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
          {upload.phase === "error" && <p className="text-sm text-status-destructive">{upload.message}</p>}
          {rowError && <p className="text-sm text-status-destructive">{rowError}</p>}
        </div>
      </div>

      <FileViewerModal
        files={files}
        currentIndex={viewingIndex}
        onClose={() => setViewingIndex(null)}
        onNavigate={setViewingIndex}
      />
    </Card>
  );
}
