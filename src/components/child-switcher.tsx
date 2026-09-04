"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/cn";

type Child = { id: string; display_name: string };

// Rendered only for a parent linked to more than one child (see
// getSelectedChild's needsSelector) - picks which child every portal page
// scopes its data to, via a `?child=<id>` query param on the current path.
// Reading the URL client-side (not a prop from the layout) is deliberate:
// layouts never receive searchParams in the App Router, only page.tsx
// does, so this is the one place that needs client-side URL access at all
// - every page itself still resolves its own selected child from its own
// searchParams prop, server-side.
export function ChildSwitcher({ options }: { options: Child[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // The layout that renders this has no access to the current page's
  // searchParams (only page.tsx gets that in the App Router) - reading it
  // here client-side instead keeps this in sync with whatever the actual
  // page resolved server-side via the same ?child= param.
  const currentId = searchParams.get("child") ?? options[0]?.id ?? null;

  function select(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("child", id);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="hidden text-xs text-text-muted sm:inline">מציג/ה:</span>
      {options.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => select(c.id)}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
            c.id === currentId
              ? "border-brand-accent bg-brand-accent text-white"
              : "border-border text-text-secondary hover:bg-surface-muted",
          )}
        >
          {c.display_name}
        </button>
      ))}
    </div>
  );
}
