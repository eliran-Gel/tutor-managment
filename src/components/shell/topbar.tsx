"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
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
  quickAction,
}: {
  onMenuClick?: () => void;
  userName?: string | null;
  profileHref?: string;
  userId?: string | null;
  notifications?: NotificationRow[];
  quickAction?: ReactNode;
}) {
  return (
    <header className="flex items-center justify-between border-b border-border bg-surface px-4 py-3 md:px-6">
      <button
        type="button"
        onClick={onMenuClick}
        className="flex h-9 w-9 items-center justify-center rounded-control text-text-secondary transition-transform duration-200 hover:bg-surface-muted active:scale-85 md:hidden"
        aria-label="פתח תפריט"
      >
        <Menu className="h-5 w-5" strokeWidth={2} />
      </button>

      <div className="flex min-w-0 items-center gap-3">
        {quickAction}
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
