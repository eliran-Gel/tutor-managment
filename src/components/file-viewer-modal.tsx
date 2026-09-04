"use client";

import { Modal } from "@/components/ui/modal";

export type ViewableFile = { file_name: string; mime_type: string; signedUrl: string | null };

/**
 * Opens uploaded content in place (like Google Docs' inline viewer)
 * instead of a new tab. Images and PDFs render directly; other formats
 * (doc/ppt/xls etc.) have no reliable safe way to preview inline without
 * sending the file to a third-party viewer service, so they fall back to
 * an explicit "open in a new tab" link instead of silently failing.
 *
 * Takes the whole list plus a current index (not just one file) so a
 * lesson with several summary photos can be paged through with ‹/›
 * instead of only ever showing the first one - closing the modal to
 * reopen it on a different thumbnail was the actual bug this replaced.
 * `currentIndex === null` means closed; every caller keeps its own
 * index state and just re-renders with a new one on navigate.
 */
export function FileViewerModal({
  files,
  currentIndex,
  onClose,
  onNavigate,
}: {
  files: ViewableFile[];
  currentIndex: number | null;
  onClose: () => void;
  onNavigate: (index: number) => void;
}) {
  if (currentIndex === null) return null;
  const file = files[currentIndex];
  if (!file) return null;

  const hasMultiple = files.length > 1;

  return (
    <Modal open onClose={onClose} title={file.file_name} showTitle={false} widthClassName="max-w-3xl">
      <div className="relative flex items-center justify-center">
        {hasMultiple && (
          <button
            type="button"
            onClick={() => onNavigate((currentIndex - 1 + files.length) % files.length)}
            aria-label="התמונה הקודמת"
            className="absolute left-0 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-surface/90 text-lg text-text-primary shadow-card transition-transform duration-200 hover:bg-surface active:scale-90"
          >
            ‹
          </button>
        )}

        <div className="w-full">
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
        </div>

        {hasMultiple && (
          <button
            type="button"
            onClick={() => onNavigate((currentIndex + 1) % files.length)}
            aria-label="התמונה הבאה"
            className="absolute right-0 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-surface/90 text-lg text-text-primary shadow-card transition-transform duration-200 hover:bg-surface active:scale-90"
          >
            ›
          </button>
        )}
      </div>

      {hasMultiple && (
        <p className="mt-3 text-center text-xs text-text-muted">
          {currentIndex + 1} / {files.length}
        </p>
      )}
    </Modal>
  );
}
