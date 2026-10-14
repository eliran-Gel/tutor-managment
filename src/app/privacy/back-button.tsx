"use client";

import { useRouter } from "next/navigation";

/** Returns to whatever page the visitor came from - the marketing site or
 * any page of this app - instead of always landing on /login. Only when
 * there is nothing to go back to (the page was opened directly or in a
 * fresh tab) does it fall back to the login page. */
export function BackButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        if (window.history.length > 1) router.back();
        else router.push("/login");
      }}
      className="text-sm font-medium text-brand-accent hover:underline"
    >
      → חזרה
    </button>
  );
}
