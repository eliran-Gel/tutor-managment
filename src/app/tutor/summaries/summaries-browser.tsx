"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileViewerModal, type ViewableFile } from "@/components/file-viewer-modal";
import { formatIsoDateWithWeekday } from "@/lib/dates/format";

type SummaryFile = ViewableFile & { id: string };

export type StudentSummaries = {
  id: string;
  displayName: string;
  lessons: {
    id: string;
    date: string;
    startTime: string;
    subjectName: string;
    summaryFiles: SummaryFile[];
  }[];
};

export function SummariesBrowser({ students }: { students: StudentSummaries[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewingFiles, setViewingFiles] = useState<SummaryFile[]>([]);
  const [viewingIndex, setViewingIndex] = useState<number | null>(null);

  const selected = students.find((s) => s.id === selectedId) ?? null;

  if (!selected) {
    if (students.length === 0) {
      return (
        <Card>
          <p className="text-sm text-text-muted">עדיין אין תלמידים.</p>
        </Card>
      );
    }

    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {students.map((student) => (
          <Card
            key={student.id}
            role="button"
            tabIndex={0}
            onClick={() => setSelectedId(student.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") setSelectedId(student.id);
            }}
            className="cursor-pointer transition-colors duration-200 hover:bg-surface-muted"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="min-w-0 truncate font-semibold text-text-primary">{student.displayName}</p>
              <Badge tone="neutral">{student.lessons.length} שיעורים</Badge>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => setSelectedId(null)}
        className="w-fit text-sm font-medium text-text-secondary transition-transform duration-200 hover:text-text-primary active:scale-90"
      >
        ‹ חזרה לרשימת התלמידים
      </button>

      <h2 className="text-lg font-semibold text-text-primary">{selected.displayName}</h2>

      {selected.lessons.length === 0 ? (
        <Card>
          <p className="text-sm text-text-muted">אין שיעורים מאושרים עדיין.</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {selected.lessons.map((lesson) => {
            const hasSummary = lesson.summaryFiles.length > 0;
            const label = (
              <>
                <p className="font-medium text-text-primary">
                  {lesson.subjectName} · {formatIsoDateWithWeekday(lesson.date)} · {lesson.startTime.slice(0, 5)}
                </p>
                {hasSummary ? (
                  <Badge tone="confirmed" className="mt-1">
                    {lesson.summaryFiles.length > 1 ? `${lesson.summaryFiles.length} תמונות סיכום` : "יש סיכום"}
                  </Badge>
                ) : (
                  <p className="mt-1 text-xs text-text-muted">אין סיכום עדיין · לחיצה לניהול השיעור</p>
                )}
              </>
            );

            if (hasSummary) {
              return (
                <Card
                  key={lesson.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setViewingFiles(lesson.summaryFiles);
                    setViewingIndex(0);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      setViewingFiles(lesson.summaryFiles);
                      setViewingIndex(0);
                    }
                  }}
                  className="cursor-pointer transition-colors duration-200 hover:bg-surface-muted"
                >
                  {label}
                </Card>
              );
            }

            return (
              <Link key={lesson.id} href={`/tutor/lessons/${lesson.id}`} className="block">
                <Card className="opacity-80 transition-colors duration-200 hover:bg-surface-muted hover:opacity-100">{label}</Card>
              </Link>
            );
          })}
        </div>
      )}

      <FileViewerModal files={viewingFiles} currentIndex={viewingIndex} onClose={() => setViewingIndex(null)} onNavigate={setViewingIndex} />
    </div>
  );
}
