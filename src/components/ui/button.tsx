import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "destructive";

const variantClasses: Record<Variant, string> = {
  // The "pressed" shadow (from the marketing site's .btn-primary) sits a
  // few px below the button and compresses toward flat on press, instead
  // of the flat opacity-fade every other variant uses - reserved for
  // primary since it's the one call-to-action per screen worth the extra
  // flourish.
  primary:
    "bg-[image:var(--gradient-hero)] text-white shadow-[0_4px_0_var(--color-brand-primary-shadow)] hover:brightness-110 hover:shadow-[0_4px_0_var(--color-brand-primary-shadow),0_0_20px_-4px_var(--glow-accent)] focus-visible:ring-brand-accent active:translate-y-[3px] active:shadow-[0_1px_0_var(--color-brand-primary-shadow)]",
  secondary:
    "bg-surface-muted text-text-primary border border-border hover:bg-border/60 focus-visible:ring-brand-accent",
  ghost:
    "bg-transparent text-text-primary hover:bg-surface-muted focus-visible:ring-brand-accent",
  destructive:
    "bg-status-destructive text-white hover:opacity-90 focus-visible:ring-status-destructive",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

/** Shared with any non-<button> element (e.g. a Link) that needs to look
 * like a button - never nest a real <button> inside an <a>, since browsers
 * handle that invalid markup inconsistently (clicks/focus can silently
 * misbehave). */
export function buttonClasses(variant: Variant = "primary", className?: string) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-control px-4 py-2 text-sm font-medium transition duration-200",
    "active:scale-90",
    "disabled:opacity-50 disabled:pointer-events-none",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
    variantClasses[variant],
    className,
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", ...props }, ref) => (
    <button ref={ref} className={buttonClasses(variant, className)} {...props} />
  ),
);
Button.displayName = "Button";
