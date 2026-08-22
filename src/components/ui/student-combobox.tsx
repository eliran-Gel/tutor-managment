"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

export const NEW_STUDENT = "__new__";

type Student = { id: string; display_name: string };

export function StudentCombobox({
  students,
  value,
  displayName,
  onSelect,
  className,
}: {
  students: Student[];
  value: string;
  displayName: string;
  onSelect: (studentId: string, name: string) => void;
  className?: string;
}) {
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(false);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setEditing(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const filtered = students.filter((s) => s.display_name.toLowerCase().includes(query.trim().toLowerCase()));
  const shownValue = editing ? query : value ? displayName : "";

  return (
    <div ref={rootRef} className={cn("relative min-w-0 flex-1", className)}>
      <input
        type="text"
        value={shownValue}
        placeholder="הקלד/י שם תלמיד/ה לחיפוש..."
        onChange={(e) => {
          setQuery(e.target.value);
          setEditing(true);
          setOpen(true);
          if (value) onSelect("", "");
        }}
        onFocus={() => {
          setQuery(value ? displayName : "");
          setEditing(true);
          setOpen(true);
        }}
        className="w-full rounded-control border border-border bg-background px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-accent"
      />
      {open && (
        <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-control border border-border bg-surface shadow-lg">
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              onSelect(NEW_STUDENT, "");
              setOpen(false);
              setEditing(false);
            }}
            className="block w-full px-3 py-2 text-right text-sm font-medium text-brand-accent transition-colors duration-150 hover:bg-surface-muted active:bg-surface-muted"
          >
            ➕ תלמיד/ה חדש/ה (טרם נרשם/ה)
          </button>
          {filtered.length === 0 && query.trim() && (
            <p className="px-3 py-2 text-sm text-text-muted">לא נמצאו תלמידים תואמים</p>
          )}
          {filtered.map((s) => (
            <button
              key={s.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(s.id, s.display_name);
                setOpen(false);
                setEditing(false);
              }}
              className="block w-full truncate px-3 py-2 text-right text-sm text-text-primary transition-colors duration-150 hover:bg-surface-muted active:bg-surface-muted"
            >
              {s.display_name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
