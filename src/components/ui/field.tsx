import { type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-text-secondary">
        {label}
      </label>
      {children}
    </div>
  );
}

export function TextInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "rounded-control border border-border bg-background px-3 py-2 text-sm text-text-primary",
        "placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-accent",
        className,
      )}
      {...props}
    />
  );
}
