"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { setStudentArchived } from "../actions";

export function ArchiveButton({ studentId, archived }: { studentId: string; archived: boolean }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      type="button"
      variant={archived ? "secondary" : "destructive"}
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await setStudentArchived(studentId, !archived);
          router.push("/tutor/students");
        })
      }
    >
      {isPending ? "מעדכן..." : archived ? "הוצאה מארכיון" : "העברה לארכיון"}
    </Button>
  );
}
