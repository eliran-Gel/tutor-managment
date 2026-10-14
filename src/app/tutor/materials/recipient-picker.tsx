"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SearchField } from "@/components/ui/search-box";
import { cn } from "@/lib/cn";

export type Share = { all: boolean; studentIds: string[] };
export type PickerStudent = { id: string; display_name: string };

/** Who a file is shared with: everyone (including students who join later),
 * or a hand-picked set. */
export function RecipientPicker({
  students,
  value,
  onChange,
}: {
  students: PickerStudent[];
  value: Share;
  onChange: (next: Share) => void;
}) {
  const [search, setSearch] = useState("");
  const term = search.trim().toLowerCase();
  const visible = term ? students.filter((s) => s.display_name.toLowerCase().includes(term)) : students;
  const selected = new Set(value.studentIds);

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange({ all: false, studentIds: Array.from(next) });
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => onChange({ all: !value.all, studentIds: value.studentIds })}
        className={cn(
          "w-fit rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
          value.all
            ? "border-brand-accent bg-brand-accent text-white"
            : "border-border text-text-secondary hover:bg-surface-muted",
        )}
      >
        {value.all ? "✓ משותף עם כל התלמידים" : "שתף עם כל התלמידים"}
      </button>

      {value.all ? (
        <p className="text-xs text-text-muted">
          כל התלמידים וההורים יראו את הקובץ, כולל תלמידים שיצטרפו בהמשך. לבחירה ידנית - לחץ שוב על הכפתור.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <SearchField value={search} onChange={setSearch} placeholder="חיפוש תלמיד/ה" className="sm:max-w-56" />
            <Button
              type="button"
              variant="secondary"
              className="text-xs"
              onClick={() => onChange({ all: false, studentIds: students.map((s) => s.id) })}
            >
              סימון הכל
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="text-xs"
              onClick={() => onChange({ all: false, studentIds: [] })}
            >
              ניקוי
            </Button>
            <span className="text-xs text-text-muted">נבחרו {selected.size}</span>
          </div>
          <div className="max-h-56 overflow-y-auto rounded-control border border-border">
            {visible.length === 0 ? (
              <p className="px-3 py-2 text-sm text-text-muted">לא נמצאו תלמידים.</p>
            ) : (
              visible.map((s) => (
                <label
                  key={s.id}
                  className="flex cursor-pointer items-center gap-2 border-b border-border px-3 py-2 text-sm text-text-primary last:border-b-0 hover:bg-surface-muted"
                >
                  <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggle(s.id)} />
                  {s.display_name}
                </label>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
