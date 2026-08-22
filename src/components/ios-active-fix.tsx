"use client";

import { useEffect } from "react";

/**
 * iOS Safari only applies the CSS `:active` pseudo-class on tap when a
 * touch listener exists somewhere in the document - without one, every
 * `active:` Tailwind variant across the app (press feedback on buttons,
 * links, calendar cells...) silently does nothing on iPhone, even though
 * it works fine on desktop/Android. A single no-op listener enables it
 * globally, so this needs to exist exactly once, near the document root.
 */
export function IosActiveFix() {
  useEffect(() => {
    const noop = () => {};
    document.addEventListener("touchstart", noop, { passive: true });
    return () => document.removeEventListener("touchstart", noop);
  }, []);

  return null;
}
