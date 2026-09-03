"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Fades + lifts content in as it scrolls into view, instead of everything
 * just being static the instant the page paints - once={true} means it
 * plays on first entry and never re-triggers or re-hides on scroll-back,
 * so re-reading the page never causes a flicker.
 */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -60px 0px" }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
