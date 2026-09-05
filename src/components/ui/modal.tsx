"use client";

import { type ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

const TRANSITION_MS = 180;

export function Modal({
  open,
  onClose,
  title,
  showTitle = true,
  children,
  widthClassName = "max-w-md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Set false to keep `title` as the dialog's accessible name without
   * rendering it visually (e.g. a file viewer where the content itself
   * makes the filename redundant). */
  showTitle?: boolean;
  children: ReactNode;
  /** Override the default `max-w-md` for content that needs more room
   * (e.g. an embedded image/PDF preview). */
  widthClassName?: string;
}) {
  // Stays mounted slightly past `open=false` so the closing transition can
  // actually play instead of the whole dialog just vanishing - open/close
  // used to be an instant unmount with no animation at all.
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);

  // Mirrors the open/close lifecycle of an external system (the DOM
  // transition), not state derived from props/state - it can't be
  // computed during render.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (open) {
      setMounted(true);
      const raf = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(raf);
    }
    setVisible(false);
    const timeout = setTimeout(() => setMounted(false), TRANSITION_MS);
    return () => clearTimeout(timeout);
  }, [open]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className={cn(
          "absolute inset-0 bg-black/40 transition-opacity duration-200",
          visible ? "opacity-100" : "opacity-0",
        )}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          `relative flex max-h-[90vh] w-full ${widthClassName} flex-col rounded-card border border-border bg-surface shadow-elevated`,
          "transition duration-200 ease-out",
          visible ? "translate-y-0 scale-100 opacity-100" : "translate-y-2 scale-95 opacity-0",
        )}
      >
        <div className="flex shrink-0 items-center justify-end border-b border-border px-6 py-4">
          {showTitle && <h2 className="me-auto text-base font-semibold text-text-primary">{title}</h2>}
          <button
            type="button"
            onClick={onClose}
            aria-label="סגור"
            className="flex h-7 w-7 items-center justify-center rounded-full text-text-muted transition-transform duration-200 hover:bg-surface-muted active:scale-85"
          >
            ✕
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-4">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
