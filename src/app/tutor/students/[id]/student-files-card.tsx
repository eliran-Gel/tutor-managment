"use client";

import { useRef, useState, useTransition, type ChangeEvent } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileViewerModal } from "@/components/file-viewer-modal";
import { uploadMaterialFile } from "@/app/tutor/materials/upload-material";

type FileRow = {
  id: string;
  file_name: string;
  mime_type: string;
  all_students: boolean;
  signedUrl: string | null;
};

type UploadStatus =
  | { phase: "idle" }
  | { phase: "uploading"; fileName: string }
  | { phase: "success"; fileName: string }
  | { phase: "error"; message: string };

const ACCEPT = "image/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt";

/** The materials this student can see (shared with them specifically, or
 * with everyone), plus a quick way to share a new file with just them.
 * Changing who else has a file, or deleting it, happens on the materials
 * page - the same file is shared with several students there. */
export function StudentFilesCard({ studentId, files }: { studentId: string; files: FileRow[] }) {
  const [upload, setUpload] = useState<UploadStatus>({ phase: "idle" });
  const [viewingIndex, setViewingIndex] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    startTransition(async () => {
      setUpload({ phase: "uploading", fileName: file.name });
      const error = await uploadMaterialFile(file, { all: false, studentIds: [studentId] });
      if (error) {
        setUpload({ phase: "error", message: error });
        return;
      }
      setUpload({ phase: "success", fileName: file.name });
      setTimeout(() => setUpload((cur) => (cur.phase === "success" ? { phase: "idle" } : cur)), 3000);
    });
  }

  const busy = isPending || upload.phase === "uploading";

  return (
    <Card>
      <CardHeader>
        <CardTitle>חומרי עזר לתלמיד/ה</CardTitle>
      </CardHeader>
      <p className="mb-4 text-sm text-text-muted">
        קבצים שמשותפים עם התלמיד/ה (וההורים), בלי קשר לשיעור. לשיתוף עם עוד תלמידים, להסרה או למחיקה -{" "}
        <Link href="/tutor/materials" className="font-medium text-brand-accent hover:underline">
          עמוד חומרי העזר
        </Link>
        .
      </p>

      {files.length === 0 ? (
        <p className="text-sm text-text-muted">עדיין אין חומרי עזר משותפים עם התלמיד/ה הזה.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {files.map((f, i) => (
            <div
              key={f.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-border px-3 py-2"
            >
              {f.signedUrl ? (
                <button
                  type="button"
                  onClick={() => setViewingIndex(i)}
                  className="min-w-0 truncate text-sm font-medium text-brand-accent hover:underline"
                >
                  {f.file_name}
                </button>
              ) : (
                <span className="min-w-0 truncate text-sm text-text-muted">{f.file_name}</span>
              )}
              <Badge tone={f.all_students ? "confirmed" : "neutral"}>
                {f.all_students ? "משותף עם כולם" : "משותף עם התלמיד/ה"}
              </Badge>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-4">
        <input ref={fileInputRef} type="file" accept={ACCEPT} onChange={handleFileChange} className="hidden" />
        <Button type="button" disabled={busy} onClick={() => fileInputRef.current?.click()}>
          {busy ? "מעלה..." : "העלאת חומר עזר לתלמיד/ה"}
        </Button>
        <div className="w-full" aria-live="polite">
          {upload.phase === "uploading" && (
            <p className="flex items-center gap-2 text-sm text-text-secondary">
              <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-border border-t-brand-accent" />
              מעלה את &quot;{upload.fileName}&quot;...
            </p>
          )}
          {upload.phase === "success" && (
            <p className="text-sm font-medium text-status-confirmed">✓ הועלה ושותף: &quot;{upload.fileName}&quot;</p>
          )}
          {upload.phase === "error" && <p className="text-sm text-status-destructive">{upload.message}</p>}
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
