import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "destructive";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-brand-primary text-white hover:opacity-90 focus-visible:ring-brand-accent",
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
