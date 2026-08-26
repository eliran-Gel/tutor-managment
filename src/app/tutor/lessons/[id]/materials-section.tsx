"use client";

import { useRef, useState, useTransition } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { uploadMaterial, deleteMaterial, toggleMaterialVisibility } from "./actions";

type MaterialRow = {
  id: string;
  file_name: string;
  storage_path: string;
  visible_to_students: boolean;
  signedUrl: string | null;
};

export function MaterialsSection({ lessonId, materials }: { lessonId: string; materials: MaterialRow[] }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  function submit() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setError(null);
    const formData = new FormData();
    formData.set("file", file);
    startTransition(async () => {
      const result = await uploadMaterial(lessonId, formData);
      if ("error" in result && result.error) setError(result.error);
      else if (fileRef.current) fileRef.current.value = "";
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>חומרי עזר</CardTitle>
      </CardHeader>

      {materials.length === 0 ? (
        <p className="text-sm text-text-muted">עדיין לא הועלו חומרי עזר לשיעור הזה.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {materials.map((m) => (
            <div key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-border px-3 py-2">
              <div className="min-w-0 flex items-center gap-2">
                {m.signedUrl ? (
                  <a href={m.signedUrl} target="_blank" rel="noreferrer" className="truncate text-sm font-medium text-brand-accent hover:underline">
                    {m.file_name}
                  </a>
                ) : (
                  <span className="truncate text-sm text-text-muted">{m.file_name}</span>
                )}
                <Badge tone={m.visible_to_students ? "confirmed" : "neutral"} className="shrink-0">
                  {m.visible_to_students ? "גלוי לתלמיד/ה" : "מוסתר"}
                </Badge>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="text-xs"
                  disabled={isPending}
                  onClick={() =>
                    startTransition(async () => {
                      await toggleMaterialVisibility(m.id, !m.visible_to_students, lessonId);
                    })
                  }
                >
                  {m.visible_to_students ? "הסתרה" : "הצגה"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="text-xs"
                  disabled={isPending}
                  onClick={() => startTransition(async () => { await deleteMaterial(m.id, m.storage_path, lessonId); })}
                >
                  מחיקה
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-4">
        <input ref={fileRef} type="file" className="text-sm text-text-secondary" />
        {error && <p className="text-sm text-status-destructive">{error}</p>}
        <Button type="button" disabled={isPending} onClick={submit}>
          {isPending ? "מעלה..." : "העלאת קובץ"}
        </Button>
      </div>
    </Card>
  );
}
