"use client";

import { forwardRef, useState, type InputHTMLAttributes } from "react";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatIsoDateWithWeekday } from "@/lib/dates/format";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * A native <input type="date"> - so the OS/browser's own calendar picker,
 * keyboard input and accessibility stay fully intact - with its own
 * locale-dependent displayed text (e.g. "Sep 2026 24", whatever language
 * the browser/OS happens to be set to, regardless of this app's own
 * Hebrew UI) replaced by a Hebrew-formatted display ("יום חמישי, 24
 * בספטמבר 2026"). The real input sits invisible on top of a fake visible
 * box covering the exact same area, so every click/tap still opens the
 * native picker - only the *text rendering* is swapped, never the
 * interaction itself.
 */
export const DateField = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, value, defaultValue, placeholder, onChange, disabled, ...props }, ref) => {
    const isControlled = value !== undefined;
    const [uncontrolledValue, setUncontrolledValue] = useState(String(defaultValue ?? ""));
    const currentValue = isControlled ? String(value ?? "") : uncontrolledValue;
    const displayText = ISO_DATE_RE.test(currentValue) ? formatIsoDateWithWeekday(currentValue) : "";

    return (
      <div
        className={cn(
          "relative rounded-control focus-within:ring-2 focus-within:ring-brand-accent",
          disabled && "opacity-50",
          className,
        )}
      >
        <div
          aria-hidden
          className="pointer-events-none flex items-center justify-between gap-2 rounded-control border border-border bg-background px-3 py-2 text-sm text-text-primary"
        >
          <span className={cn("truncate", !displayText && "text-text-muted")}>
            {displayText || placeholder || "בחר/י תאריך"}
          </span>
          <Calendar className="h-4 w-4 shrink-0 text-text-muted" strokeWidth={2} />
        </div>
        <input
          ref={ref}
          type="date"
          value={value}
          defaultValue={defaultValue}
          disabled={disabled}
          onChange={(e) => {
            if (!isControlled) setUncontrolledValue(e.target.value);
            onChange?.(e);
          }}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
          {...props}
        />
      </div>
    );
  },
);
DateField.displayName = "DateField";
