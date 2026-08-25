"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import type { NavItem } from "@/lib/nav";
import type { NotificationRow } from "@/lib/notifications";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export function AppShell({
  items,
  roleLabel,
  userName,
  profileHref,
  userId,
  notifications,
  children,
}: {
  items: NavItem[];
  roleLabel: string;
  userName?: string | null;
  profileHref?: string;
  userId?: string | null;
  notifications?: NotificationRow[];
  children: ReactNode;
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const pathname = usePathname();

  // Close the drawer only once the destination route has actually taken
  // over (pathname changed) - not on click. Closing on click left a gap
  // where the drawer had already vanished but the new page hadn't
  // rendered yet, showing the stale old page underneath for a moment.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return (
    <div className="flex min-h-full flex-1">
      <aside className="hidden w-64 shrink-0 border-border bg-surface md:block md:border-s">
        <Sidebar items={items} roleLabel={roleLabel} userName={userName} />
      </aside>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileNavOpen(false)}
          />
          <div className="absolute inset-y-0 end-0 w-72 bg-surface shadow-card">
            <Sidebar
              items={items}
              roleLabel={roleLabel}
              userName={userName}
              onSamePageClick={() => setMobileNavOpen(false)}
            />
          </div>
        </div>
      )}

      <div className="flex min-w-0 min-h-full flex-1 flex-col">
        <Topbar
          onMenuClick={() => setMobileNavOpen(true)}
          userName={userName}
          profileHref={profileHref}
          userId={userId}
          notifications={notifications}
        />
        <main className="min-w-0 flex-1 bg-background px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
