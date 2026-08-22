"use client";

import { useState, type ReactNode } from "react";
import type { NavItem } from "@/lib/nav";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export function AppShell({
  items,
  roleLabel,
  children,
}: {
  items: NavItem[];
  roleLabel: string;
  children: ReactNode;
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex min-h-full flex-1">
      <aside className="hidden w-64 shrink-0 border-border bg-surface md:block md:border-s">
        <Sidebar items={items} roleLabel={roleLabel} />
      </aside>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileNavOpen(false)}
          />
          <div className="absolute inset-y-0 end-0 w-72 bg-surface shadow-card">
            <Sidebar items={items} roleLabel={roleLabel} onNavigate={() => setMobileNavOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-h-full flex-1 flex-col">
        <Topbar onMenuClick={() => setMobileNavOpen(true)} />
        <main className="flex-1 bg-background px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
