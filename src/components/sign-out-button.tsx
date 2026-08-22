"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  return (
    <button
      type="button"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push("/login");
        router.refresh();
      }}
      className="text-sm font-medium text-text-secondary transition duration-150 hover:text-status-destructive active:scale-95 disabled:opacity-50"
    >
      {loading ? "מתנתק..." : "התנתקות"}
    </button>
  );
}
