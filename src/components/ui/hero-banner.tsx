import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "teal" | "gold" | "purple" | "green";

// Flat, solid fills (not gradients/glass) so each tile reads as its own
// bold block - deliberately staying inside the app's existing cool/brand
// palette (teal, gold-as-accent, purple, green already used for status
// colors elsewhere) rather than introducing a new hue. Raw palette tokens
// (--color-teal-500 etc.) aren't exposed as Tailwind utilities, so these
// go through inline style instead of a class lookup.
const toneStyles: Record<Tone, { background: string; color: string }> = {
  teal: { background: "var(--color-teal-500)", color: "#ffffff" },
  gold: { background: "var(--color-yellow-500)", color: "var(--color-navy-950)" },
  purple: { background: "var(--color-purple-500)", color: "#ffffff" },
  green: { background: "var(--color-green-500)", color: "#ffffff" },
};

/**
 * The one deliberately bold, dark surface on a page - a navy/teal gradient
 * band with a thick dark outline and a subtle diagonal texture, reserved
 * for the single focal moment per screen (dashboard greeting + headline
 * stats). Everything else in the app stays on the quiet surface/background
 * tokens on purpose - this is where the app is allowed to look confident
 * instead of flat.
 */
export function HeroBanner({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-card p-6 text-white shadow-elevated md:p-8",
        className,
      )}
      style={{ background: "var(--gradient-hero)", border: "3px solid var(--color-navy-950)" }}
      {...props}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, #ffffff 0 2px, transparent 2px 26px)",
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}

export function HeroStat({
  label,
  tone,
  children,
}: {
  label: string;
  tone: Tone;
  children: ReactNode;
}) {
  return (
    <div
      className="rounded-control px-4 py-3"
      style={{ ...toneStyles[tone], border: "2px solid var(--color-navy-950)" }}
    >
      <p className="text-xs font-medium opacity-80">{label}</p>
      <p className="mt-1 text-2xl font-black font-display">{children}</p>
    </div>
  );
}
