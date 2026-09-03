"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useInView } from "framer-motion";

type Variant = "integer" | "decimal1" | "currency";

// A formatting *function* prop can't cross the server/client boundary (the
// pages using this are Server Components) - a serializable variant name
// does the same job without that restriction.
function formatValue(n: number, variant: Variant) {
  switch (variant) {
    case "decimal1":
      return n.toLocaleString("he-IL", { maximumFractionDigits: 1 });
    case "currency":
      return `₪${Math.round(n).toLocaleString("he-IL")}`;
    case "integer":
    default:
      return Math.round(n).toLocaleString("he-IL");
  }
}

/**
 * Counts up from 0 to `value` once it scrolls into view, instead of the
 * number just appearing - a small touch that makes KPI cards feel alive.
 * Respects prefers-reduced-motion itself (MotionConfig's reducedMotion=
 * "user" only governs framer-motion's own transitions - this drives the
 * count via a manual rAF-based tween, which needs its own check).
 */
export function AnimatedCounter({
  value,
  variant = "integer",
  duration = 0.9,
}: {
  value: number;
  variant?: Variant;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-10% 0px" });
  const [display, setDisplay] = useState(0);

  // Genuine external-system sync (an imperative rAF-driven tween, not
  // derivable from props/state), same category as Modal's exit-animation
  // timer - not the "effect doing what a render could" case the lint rule
  // is meant to catch.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!isInView) return;

    const prefersReduced =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      setDisplay(value);
      return;
    }

    const controls = animate(0, value, {
      duration,
      ease: "easeOut",
      onUpdate: setDisplay,
    });
    return () => controls.stop();
  }, [isInView, value, duration]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return <span ref={ref}>{formatValue(display, variant)}</span>;
}
