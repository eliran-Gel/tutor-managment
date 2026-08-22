import Link from "next/link";
import type { NavItem } from "@/lib/nav";

export function Sidebar({
  items,
  roleLabel,
  onNavigate,
}: {
  items: NavItem[];
  roleLabel: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-border px-5 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-primary text-white">
          🎓
        </div>
        <div>
          <p className="text-sm font-bold text-text-primary">אלירן גלברג</p>
          <p className="text-xs text-text-muted">{roleLabel}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className="block rounded-control px-3 py-2 text-sm font-medium text-text-secondary transition duration-150 hover:bg-surface-muted hover:text-text-primary active:scale-95 active:bg-surface-muted"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
