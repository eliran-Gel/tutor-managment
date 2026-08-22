"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { SignOutButton } from "@/components/sign-out-button";

export function Topbar({
  onMenuClick,
  userName,
  profileHref,
}: {
  onMenuClick?: () => void;
  userName?: string | null;
  profileHref?: string;
}) {
  return (
    <header className="flex items-center justify-between border-b border-border bg-surface px-4 py-3 md:px-6">
      <button
        type="button"
        onClick={onMenuClick}
        className="flex h-9 w-9 items-center justify-center rounded-control text-text-secondary transition-transform duration-150 hover:bg-surface-muted active:scale-90 md:hidden"
        aria-label="פתח תפריט"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
          <path
            fillRule="evenodd"
            d="M3 6.75A.75.75 0 0 1 3.75 6h16.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 6.75ZM3 12a.75.75 0 0 1 .75-.75h16.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 12Zm0 5.25a.75.75 0 0 1 .75-.75h16.5a.75.75 0 0 1 0 1.5H3.75a.75.75 0 0 1-.75-.75Z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      <div className="flex items-center gap-4">
        {userName && profileHref && (
          <Link
            href={profileHref}
            className="hidden text-sm font-medium text-text-primary transition-transform duration-150 hover:text-brand-accent active:scale-95 md:inline"
          >
            {userName}
          </Link>
        )}
        <SignOutButton />
        <button
          type="button"
          disabled
          title="התראות - בקרוב"
          className="relative flex h-9 w-9 cursor-not-allowed items-center justify-center rounded-full text-text-secondary opacity-40"
          aria-label="התראות (בקרוב)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
            <path d="M5.25 9a6.75 6.75 0 0 1 13.5 0v.75c0 2.123.8 4.057 2.118 5.52a.75.75 0 0 1-.297 1.206c-1.544.57-3.16.99-4.831 1.243a3.75 3.75 0 1 1-7.48 0 24.585 24.585 0 0 1-4.831-1.244.75.75 0 0 1-.298-1.205A8.217 8.217 0 0 0 5.25 9.75V9Zm4.502 8.9a2.25 2.25 0 1 0 4.496 0 25.057 25.057 0 0 1-4.496 0Z" />
          </svg>
        </button>
        <ThemeToggle />
      </div>
    </header>
  );
}
