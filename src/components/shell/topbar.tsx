"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { SignOutButton } from "@/components/sign-out-button";
import { NotificationBell } from "@/components/shell/notification-bell";
import type { NotificationRow } from "@/lib/notifications";

export function Topbar({
  onMenuClick,
  userName,
  profileHref,
  userId,
  notifications,
}: {
  onMenuClick?: () => void;
  userName?: string | null;
  profileHref?: string;
  userId?: string | null;
  notifications?: NotificationRow[];
}) {
  return (
    <header className="flex items-center justify-between border-b border-border bg-surface px-4 py-3 md:px-6">
      <button
        type="button"
        onClick={onMenuClick}
        className="flex h-9 w-9 items-center justify-center rounded-control text-text-secondary transition-transform duration-200 hover:bg-surface-muted active:scale-85 md:hidden"
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

      <div className="flex min-w-0 items-center gap-4">
        {userName && profileHref && (
          <Link
            href={profileHref}
            className="hidden max-w-40 truncate text-sm font-medium text-text-primary transition-transform duration-200 hover:text-brand-accent active:scale-90 md:inline"
          >
            {userName}
          </Link>
        )}
        <SignOutButton />
        {userId && <NotificationBell userId={userId} initialNotifications={notifications ?? []} />}
        <ThemeToggle />
      </div>
    </header>
  );
}
