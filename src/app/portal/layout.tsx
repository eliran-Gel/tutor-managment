import type { ReactNode } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { portalNav } from "@/lib/nav";

export default function PortalLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell items={portalNav} roleLabel="תלמיד">
      {children}
    </AppShell>
  );
}
