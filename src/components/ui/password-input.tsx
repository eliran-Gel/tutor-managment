"use client";

import { useState, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function PasswordInput({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        type={visible ? "text" : "password"}
        className={cn(
          "w-full rounded-control border border-border bg-background py-2 pe-3 ps-9 text-sm text-text-primary",
          "placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-accent",
          className,
        )}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "הסתרת סיסמה" : "הצגת סיסמה"}
        className="absolute inset-y-0 start-0 flex w-9 items-center justify-center text-text-muted hover:text-text-secondary"
      >
        {visible ? (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
            <path d="M3.53 2.47a.75.75 0 0 0-1.06 1.06l18 18a.75.75 0 1 0 1.06-1.06l-2.06-2.061c2.293-1.396 4.023-3.442 4.83-4.61a1.99 1.99 0 0 0 0-2.276C22.31 8.652 18.535 4.5 12 4.5c-1.836 0-3.462.328-4.887.879l-3.583-3.909ZM12 6c5.302 0 8.535 3.463 9.928 5.373-.712 1.001-2.169 2.735-4.098 3.99l-1.976-1.977a3.75 3.75 0 0 0-5.24-5.24L8.31 6.842A9.5 9.5 0 0 1 12 6Z" />
            <path d="M4.35 6.71c-1.635 1.336-2.868 2.99-3.478 3.93a1.99 1.99 0 0 0 0 2.276C2.264 15.348 6.04 19.5 12 19.5c1.293 0 2.478-.198 3.548-.53l-2.29-2.29a3.75 3.75 0 0 1-4.938-4.938L4.35 6.71Z" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
            <path d="M12 4.5c-6.535 0-10.31 4.652-11.42 6.152a1.99 1.99 0 0 0 0 2.276C1.69 14.348 5.465 19.5 12 19.5c6.535 0 10.31-5.152 11.42-6.652a1.99 1.99 0 0 0 0-2.276C22.31 9.152 18.535 4.5 12 4.5Zm0 13.5c-5.302 0-8.535-4.463-9.928-6.5C3.465 9.463 6.698 6 12 6c5.302 0 8.535 3.463 9.928 5.5C20.535 13.537 17.302 18 12 18Z" />
            <path d="M12 8.25a3.75 3.75 0 1 0 0 7.5 3.75 3.75 0 0 0 0-7.5Z" />
          </svg>
        )}
      </button>
    </div>
  );
}
