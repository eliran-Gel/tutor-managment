"use client";

import { useRef, useState, useTransition, type ChangeEvent } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { FileViewerModal } from "@/components/file-viewer-modal";
import { deleteMaterial, setMaterialRecipients } from "./actions";
import { RecipientPicker, type PickerStudent, type Share } from "./recipient-picker";
import { uploadMaterialFile } from "./upload-material";

export type ManagedMaterial = {
  id: string;
  file_name: string;
  storage_path: string;
  mime_type: string;
  all_students: boolean;
  recipientIds: string[];
  signedUrl: string | null;
};

const ACCEPT = "image/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt";

type UploadStatus =
  | { phase: "idle" }
  | { phase: "uploading"; fileName: string }
  | { phase: "success"; fileName: string }
  | { phase: "error"; message: string };

function recipientSummary(material: ManagedMaterial, nameById: Map<string, string>) {
  if (material.all_students) return "כל התלמידים";
  const names = material.recipientIds.map((id) => nameById.get(id)).filter((n): n is string => Boolean(n));
  if (names.length <= 3) return names.join(", ");
  return `${names.slice(0, 3).join(", ")} ועוד ${names.length - 3}`;
}

function UploadPanel({ students }: { students: PickerStudent[] }) {
  const [share, setShare] = useState<Share>({ all: false, studentIds: [] });
  const [upload, setUpload] = useState<UploadStatus>({ phase: "idle" });
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!share.all && share.studentIds.length === 0) {
      setUpload({ phase: "error", message: "קודם יש לבחור תלמיד/ה אחד/ת לפחות, או ללחוץ \"שתף עם כל התלמידים\"." });
      return;
    }
    startTransition(async () => {
      setUpload({ phase: "uploading", fileName: file.name });
      const error = await uploadMaterialFile(file, share);
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
        <CardTitle>שיתוף חומר עזר חדש</CardTitle>
      </CardHeader>
      <p className="mb-4 text-sm text-text-muted">
        בחר עם מי לשתף, ואז העלה את הקובץ. אותו קובץ נשמר פעם אחת ומופיע אצל כל מי שבחרת.
      </p>
      <RecipientPicker students={students} value={share} onChange={setShare} />
      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-4">
        <input ref={fileInputRef} type="file" accept={ACCEPT} onChange={handleFileChange} className="hidden" />
        <Button type="button" disabled={busy} onClick={() => fileInputRef.current?.click()}>
          {busy ? "מעלה..." : "בחירת קובץ והעלאה"}
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
    </Card>
  );
}

function ManageSharingModal({
  material,
  students,
  open,
  onClose,
}: {
  material: ManagedMaterial;
  students: PickerStudent[];
  open: boolean;
  onClose: () => void;
}) {
  const [share, setShare] = useState<Share>({ all: material.all_students, studentIds: material.recipientIds });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <Modal open={open} onClose={onClose} title="ניהול שיתוף" widthClassName="max-w-lg">
      <div className="flex flex-col gap-4">
        <p className="break-words text-sm font-medium text-text-primary">{material.file_name}</p>
        <RecipientPicker students={students} value={share} onChange={setShare} />
        {error && <p className="text-sm text-status-destructive">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            ביטול
          </Button>
          <Button
            type="button"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                setError(null);
                const result = await setMaterialRecipients(material.id, share);
                if ("error" in result && result.error) setError(result.error);
                else onClose();
              })
            }
          >
            {isPending ? "שומר..." : "שמירת השיתוף"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function MaterialRow({
  material,
  students,
  nameById,
  onView,
}: {
  material: ManagedMaterial;
  students: PickerStudent[];
  nameById: Map<string, string>;
  onView: () => void;
}) {
  const [managing, setManaging] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <Card id={`material-${material.id}`} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {material.signedUrl ? (
            <button
              type="button"
              onClick={onView}
              className="break-words text-start text-sm font-medium text-brand-accent hover:underline"
            >
              {material.file_name}
            </button>
          ) : (
            <span className="break-words text-sm text-text-muted">{material.file_name}</span>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Badge tone={material.all_students ? "confirmed" : "neutral"}>
              {material.all_students ? "כולם" : `${material.recipientIds.length} תלמידים`}
            </Badge>
            <span className="text-xs text-text-muted">{recipientSummary(material, nameById)}</span>
          </div>
        </div>

        {confirmingDelete ? (
          <div className="flex shrink-0 items-center gap-2">
            <Button type="button" variant="secondary" disabled={isPending} onClick={() => setConfirmingDelete(false)}>
              חזרה
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  setError(null);
                  const result = await deleteMaterial(material.id, material.storage_path);
                  if ("error" in result && result.error) setError(result.error);
                })
              }
            >
              {isPending ? "מוחק..." : "כן, למחוק את הקובץ"}
            </Button>
          </div>
        ) : (
          <div className="flex shrink-0 items-center gap-2">
            <Button type="button" variant="secondary" className="text-xs" onClick={() => setManaging(true)}>
              ניהול שיתוף
            </Button>
            <Button type="button" variant="secondary" className="text-xs" onClick={() => setConfirmingDelete(true)}>
              מחיקה
            </Button>
          </div>
        )}
      </div>
      {error && <p className="text-sm text-status-destructive">{error}</p>}

      {managing && (
        <ManageSharingModal material={material} students={students} open={managing} onClose={() => setManaging(false)} />
      )}
    </Card>
  );
}

export function MaterialsManager({ materials, students }: { materials: ManagedMaterial[]; students: PickerStudent[] }) {
  const [viewingIndex, setViewingIndex] = useState<number | null>(null);
  const nameById = new Map(students.map((s) => [s.id, s.display_name]));

  return (
    <div className="flex flex-col gap-6">
      <UploadPanel students={students} />

      <div className="flex flex-col gap-2">
        <h2 className="text-base font-semibold text-text-primary">חומרים ששיתפת ({materials.length})</h2>
        {materials.length === 0 && (
          <Card>
            <p className="text-sm text-text-muted">עדיין לא שיתפת חומרי עזר.</p>
          </Card>
        )}
        {materials.map((m, i) => (
          <MaterialRow
            key={m.id}
            material={m}
            students={students}
            nameById={nameById}
            onView={() => setViewingIndex(i)}
          />
        ))}
      </div>

      <FileViewerModal
        files={materials}
        currentIndex={viewingIndex}
        onClose={() => setViewingIndex(null)}
        onNavigate={setViewingIndex}
      />
    </div>
  );
}
