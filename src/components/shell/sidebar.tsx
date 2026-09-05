"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GraduationCap } from "lucide-react";
import { cn } from "@/lib/cn";
import type { NavItem } from "@/lib/nav";

export function Sidebar({
  items,
  roleLabel,
  userName,
  onSamePageClick,
}: {
  items: NavItem[];
  roleLabel: string;
  userName?: string | null;
  /** Fires when the clicked link is the page already showing - no route
   * change will happen, so a caller closing a drawer on route-change can't
   * rely on that here and needs this explicit signal instead. */
  onSamePageClick?: () => void;
}) {
  const pathname = usePathname();
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-border px-5 py-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-primary text-white">
          <GraduationCap className="h-5 w-5" strokeWidth={2} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-text-primary">{userName ?? roleLabel}</p>
          <p className="text-xs text-text-muted">{roleLabel}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {items.map((item) => {
          // Highlights a parent nav entry while viewing one of its detail
          // pages too (e.g. /tutor/students/[id] under "תלמידים"), not
          // just an exact route match.
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => {
                if (item.href === pathname) onSamePageClick?.();
              }}
              className={cn(
                "relative block rounded-control px-3 py-2 text-sm font-medium transition duration-200 active:scale-95",
                isActive
                  ? "bg-brand-primary/10 text-brand-primary"
                  : "text-text-secondary hover:bg-surface-muted hover:text-text-primary",
              )}
            >
              {isActive && (
                <span className="absolute inset-y-1.5 end-0 w-0.5 rounded-full bg-brand-accent" aria-hidden />
              )}
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
