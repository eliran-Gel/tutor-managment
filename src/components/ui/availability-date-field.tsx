"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatIsoDateWithWeekday, HEBREW_MONTHS_FULL } from "@/lib/dates/format";
import { getMonthAvailabilityAction } from "@/lib/day-availability-actions";
import type { DayAvailability } from "@/lib/day-availability";

const WEEKDAY_LABELS = ["א", "ב", "ג", "ד", "ה", "ו", "ש"];

function toIso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseIso(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

const monthKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}`;

/**
 * Same visible "fake box over a real field" trick as DateField, but instead
 * of a native <input type="date"> underneath, this opens a custom popover
 * calendar - the native picker has no way to show a per-day availability
 * dot, which is the whole point here (booking flows only: knowing at a
 * glance which days have open hours vs. none vs. aren't taught at all).
 */
export function AvailabilityDateField({
  id,
  name,
  value,
  onChange,
  min,
  max,
  disabled,
  placeholder,
}: {
  id?: string;
  name?: string;
  value: string;
  onChange?: (e: { target: { value: string } }) => void;
  min?: string;
  max?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => (value ? parseIso(value) : new Date()));
  const [availabilityByMonth, setAvailabilityByMonth] = useState<Record<string, Record<string, DayAvailability>>>({});
  const [loadingMonth, setLoadingMonth] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const key = monthKey(viewMonth);
  const monthAvailability = availabilityByMonth[key];
  const minDate = min ? parseIso(min) : null;
  const maxDate = max ? parseIso(max) : null;

  // Fetches this month's availability from the server whenever the popover
  // opens on a month it hasn't already loaded - a genuine external-data
  // sync, not derived state.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open || monthAvailability || loadingMonth === key) return;
    let cancelled = false;
    setLoadingMonth(key);
    getMonthAvailabilityAction(viewMonth.getFullYear(), viewMonth.getMonth()).then((map) => {
      if (cancelled) return;
      setAvailabilityByMonth((prev) => ({ ...prev, [key]: map }));
      setLoadingMonth(null);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, key]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function updateCoords() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.max(rect.width, 288);
    // Clamped to the viewport, not just anchored to the trigger - on a
    // narrow screen a trigger near the left/right edge would otherwise
    // push the 288px-wide popover partly off-screen.
    const left = Math.min(Math.max(rect.left, 8), window.innerWidth - width - 8);
    setCoords({ top: rect.bottom + 4, left, width });
  }

  useEffect(() => {
    if (!open) return;
    updateCoords();
    function handlePointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || popoverRef.current?.contains(target)) return;
      setOpen(false);
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("resize", updateCoords);
    document.addEventListener("scroll", updateCoords, true);
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("resize", updateCoords);
      document.removeEventListener("scroll", updateCoords, true);
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const days = useMemo(() => {
    const firstOfMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
    const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < firstOfMonth.getDay(); i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), d));
    return cells;
  }, [viewMonth]);

  function isDisabled(day: Date) {
    if (minDate && day < minDate) return true;
    if (maxDate && day > maxDate) return true;
    return false;
  }

  function selectDay(day: Date) {
    onChange?.({ target: { value: toIso(day) } });
    setOpen(false);
  }

  const prevDisabled = Boolean(minDate && new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 0) < minDate);
  const nextDisabled = Boolean(maxDate && new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1) > maxDate);

  const displayText = /^\d{4}-\d{2}-\d{2}$/.test(value) ? formatIsoDateWithWeekday(value) : "";

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => {
          if (!open) setViewMonth(value ? parseIso(value) : new Date());
          setOpen((o) => !o);
        }}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-control border border-border bg-background px-3 py-2 text-sm text-text-primary",
          "focus:outline-none focus:ring-2 focus:ring-brand-accent disabled:cursor-not-allowed disabled:opacity-50",
        )}
      >
        <span className={cn("truncate", !displayText && "text-text-muted")}>
          {displayText || placeholder || "בחר/י תאריך"}
        </span>
        <Calendar className="h-4 w-4 shrink-0 text-text-muted" strokeWidth={2} />
      </button>
      {name && <input type="hidden" name={name} value={value} />}

      {open &&
        coords &&
        createPortal(
          <div
            ref={popoverRef}
            style={{ position: "fixed", top: coords.top, left: coords.left, width: coords.width }}
            className="z-50 rounded-control border border-border bg-surface p-3 shadow-elevated"
          >
            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                disabled={prevDisabled}
                onClick={() => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
                className="rounded-control p-1 text-text-secondary transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-30"
                aria-label="חודש קודם"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <p className="text-sm font-semibold text-text-primary">
                {HEBREW_MONTHS_FULL[viewMonth.getMonth()]} {viewMonth.getFullYear()}
              </p>
              <button
                type="button"
                disabled={nextDisabled}
                onClick={() => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
                className="rounded-control p-1 text-text-secondary transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-30"
                aria-label="חודש הבא"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-7 text-center text-xs text-text-muted">
              {WEEKDAY_LABELS.map((w, i) => (
                <div key={i} className="py-1">
                  {w}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-0.5">
              {days.map((day, i) => {
                if (!day) return <div key={`pad-${i}`} />;
                const iso = toIso(day);
                const status = monthAvailability?.[iso];
                const dayDisabled = isDisabled(day);
                const isSelected = value === iso;
                return (
                  <button
                    key={iso}
                    type="button"
                    disabled={dayDisabled}
                    onClick={() => selectDay(day)}
                    className={cn(
                      "flex flex-col items-center gap-0.5 rounded-control py-1.5 text-sm transition-colors",
                      dayDisabled
                        ? "cursor-not-allowed text-text-muted/40"
                        : "text-text-primary hover:bg-surface-muted",
                      isSelected && "bg-brand-accent text-white hover:bg-brand-accent",
                    )}
                  >
                    <span>{day.getDate()}</span>
                    {!dayDisabled &&
                      (status ? (
                        <span
                          title={
                            status === "open"
                              ? "יש שעות פנויות"
                              : status === "full"
                                ? "אין שעות פנויות"
                                : "לא מלמד ביום הזה"
                          }
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            status === "open" && "bg-status-confirmed",
                            status === "full" && "border border-current bg-white",
                            status === "closed" && "bg-status-destructive",
                          )}
                        />
                      ) : (
                        <span className="h-1.5 w-1.5 rounded-full bg-border" />
                      ))}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 border-t border-border pt-2 text-[11px] text-text-muted">
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-status-confirmed" /> יש שעות פנויות
              </span>
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full border border-border bg-white" /> אין שעות פנויות
              </span>
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-status-destructive" /> לא מלמד
              </span>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
