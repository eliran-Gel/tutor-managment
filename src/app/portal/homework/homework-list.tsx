"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui/card";
import { markHomeworkDone } from "./actions";

type HomeworkItem = {
  id: string;
  description: string;
  is_done: boolean;
  due_date_label: string | null;
  lesson_label: string | null;
};

export function HomeworkList({ homework }: { homework: HomeworkItem[] }) {
  const [items, setItems] = useState(homework);
  const [, startTransition] = useTransition();

  function toggle(id: string, current: boolean) {
    setItems((prev) => prev.map((h) => (h.id === id ? { ...h, is_done: !current } : h)));
    startTransition(async () => {
      await markHomeworkDone(id, !current);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map((hw) => (
        <Card key={hw.id} className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={hw.is_done}
            onChange={() => toggle(hw.id, hw.is_done)}
            className="mt-1 h-4 w-4 shrink-0"
          />
          <div className="min-w-0">
            <p className={`break-words text-sm font-medium ${hw.is_done ? "text-text-muted line-through" : "text-text-primary"}`}>
              {hw.description}
            </p>
            <p className="mt-1 text-xs text-text-muted">
              {hw.lesson_label}
              {hw.due_date_label && ` · עד ${hw.due_date_label}`}
            </p>
          </div>
        </Card>
      ))}
    </div>
  );
}
