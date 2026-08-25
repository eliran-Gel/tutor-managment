"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-primary text-white">
          🎓
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-text-primary">{userName ?? roleLabel}</p>
          <p className="text-xs text-text-muted">{roleLabel}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => {
              if (item.href === pathname) onSamePageClick?.();
            }}
            className="block rounded-control px-3 py-2 text-sm font-medium text-text-secondary transition duration-200 hover:bg-surface-muted hover:text-text-primary active:scale-90 active:bg-surface-muted"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
