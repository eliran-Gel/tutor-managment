import type { ReactNode } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { tutorNav } from "@/lib/nav";

export default function TutorLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell items={tutorNav} roleLabel="מורה פרטי">
      {children}
    </AppShell>
  );
}
