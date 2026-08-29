"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import type { NavItem } from "@/lib/nav";
import type { NotificationRow } from "@/lib/notifications";
import { PushPermissionCard } from "@/components/push-permission-card";
import { cn } from "@/lib/cn";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

const DRAWER_TRANSITION_MS = 200;

export function AppShell({
  items,
  roleLabel,
  userName,
  profileHref,
  userId,
  notifications,
  quickAction,
  children,
}: {
  items: NavItem[];
  roleLabel: string;
  userName?: string | null;
  profileHref?: string;
  userId?: string | null;
  notifications?: NotificationRow[];
  quickAction?: ReactNode;
  children: ReactNode;
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [drawerMounted, setDrawerMounted] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const pathname = usePathname();

  // Close the drawer only once the destination route has actually taken
  // over (pathname changed) - not on click. Closing on click left a gap
  // where the drawer had already vanished but the new page hadn't
  // rendered yet, showing the stale old page underneath for a moment.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  // Same "stay mounted through the closing transition" pattern as Modal -
  // the drawer used to just vanish instantly instead of sliding away.
  useEffect(() => {
    if (mobileNavOpen) {
      setDrawerMounted(true);
      const raf = requestAnimationFrame(() => setDrawerVisible(true));
      return () => cancelAnimationFrame(raf);
    }
    setDrawerVisible(false);
    const timeout = setTimeout(() => setDrawerMounted(false), DRAWER_TRANSITION_MS);
    return () => clearTimeout(timeout);
  }, [mobileNavOpen]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return (
    <div className="flex min-h-full flex-1">
      <aside className="hidden w-64 shrink-0 border-border bg-surface md:block md:border-s">
        <Sidebar items={items} roleLabel={roleLabel} userName={userName} />
      </aside>

      {drawerMounted && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className={cn(
              "absolute inset-0 bg-black/40 transition-opacity duration-200",
              drawerVisible ? "opacity-100" : "opacity-0",
            )}
            onClick={() => setMobileNavOpen(false)}
          />
          <div
            className={cn(
              // The app is RTL-only, so the drawer sits at the visual left
              // edge (`end-0`) - sliding it in means coming from further
              // left, i.e. a negative translateX (not RTL-logical, but
              // there's no LTR mode to worry about getting backwards).
              "absolute inset-y-0 end-0 w-72 bg-surface shadow-card transition-transform duration-200 ease-out",
              drawerVisible ? "translate-x-0" : "-translate-x-full",
            )}
          >
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
          quickAction={quickAction}
        />
        <main className="min-w-0 flex-1 bg-background px-4 py-6 md:px-8">
          {userId && <PushPermissionCard />}
          {children}
        </main>
      </div>
    </div>
  );
}
