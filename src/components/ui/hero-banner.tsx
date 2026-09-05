import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * The one deliberately bold, dark surface on a page - a navy/teal gradient
 * band with soft glow accents, reserved for the single focal moment per
 * screen (dashboard greeting + headline stats). Everything else in the app
 * stays on the quiet surface/background tokens on purpose - this is where
 * the app is allowed to look confident instead of flat.
 */
export function HeroBanner({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-card p-6 text-white shadow-elevated md:p-8",
        className,
      )}
      style={{ background: "var(--gradient-hero)" }}
      {...props}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -start-16 h-64 w-64 rounded-full opacity-40 blur-3xl"
        style={{ background: "var(--glow-accent)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-20 -end-10 h-56 w-56 rounded-full opacity-25 blur-3xl"
        style={{ background: "var(--glow-highlight)" }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}

export function HeroStat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-control border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
      <p className="text-xs font-medium text-white/70">{label}</p>
      <p className="mt-1 text-2xl font-black font-display text-white">{children}</p>
    </div>
  );
}
