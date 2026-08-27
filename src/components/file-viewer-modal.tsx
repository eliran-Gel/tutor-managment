"use client";

import { Modal } from "@/components/ui/modal";

export type ViewableFile = { file_name: string; mime_type: string; signedUrl: string | null };

/**
 * Opens uploaded content in place (like Google Docs' inline viewer)
 * instead of a new tab. Images and PDFs render directly; other formats
 * (doc/ppt/xls etc.) have no reliable safe way to preview inline without
 * sending the file to a third-party viewer service, so they fall back to
 * an explicit "open in a new tab" link instead of silently failing.
 */
export function FileViewerModal({ file, onClose }: { file: ViewableFile | null; onClose: () => void }) {
  if (!file) return null;

  return (
    <Modal open onClose={onClose} title={file.file_name} widthClassName="max-w-3xl">
      {!file.signedUrl ? (
        <p className="text-sm text-status-destructive">שגיאה בטעינת הקובץ.</p>
      ) : file.mime_type.startsWith("image/") ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={file.signedUrl} alt={file.file_name} className="mx-auto max-h-[75vh] w-auto rounded-control" />
      ) : file.mime_type === "application/pdf" ? (
        <iframe
          src={file.signedUrl}
          title={file.file_name}
          className="h-[75vh] w-full rounded-control border border-border"
        />
      ) : (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <p className="text-sm text-text-muted">אין תצוגה מקדימה זמינה לסוג הקובץ הזה.</p>
          <a
            href={file.signedUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-brand-accent hover:underline"
          >
            פתיחת הקובץ בחלון חדש ←
          </a>
        </div>
      )}
    </Modal>
  );
}
