"use client";

import { MotionConfig } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Wraps the whole app so every animation built with framer-motion (Reveal,
 * AnimatedCounter, and anything added later) automatically turns itself
 * off for a user with "Reduce Motion" on at the OS level - reducedMotion=
 * "user" reads that system setting, rather than every component having to
 * remember to check it individually.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
