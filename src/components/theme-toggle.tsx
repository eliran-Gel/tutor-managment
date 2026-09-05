"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

function applyTheme(theme: "light" | "dark") {
  document.documentElement.setAttribute("data-theme", theme);
  document.cookie = `theme=${theme}; path=/; max-age=31536000; SameSite=Lax`;
}

export function ThemeToggle() {
  const [isDark, setIsDark] = useState<boolean | null>(null);

  useEffect(() => {
    // Resolving the active theme requires reading the DOM attribute set by
    // the server (from the theme cookie) and, absent that, the browser's
    // color-scheme media query — neither is available during SSR, so this
    // one-time sync on mount is intentional (avoids a light/dark flash).
    /* eslint-disable react-hooks/set-state-in-effect */
    const current = document.documentElement.getAttribute("data-theme");
    if (current === "dark") {
      setIsDark(true);
    } else if (current === "light") {
      setIsDark(false);
    } else {
      setIsDark(window.matchMedia("(prefers-color-scheme: dark)").matches);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  if (isDark === null) {
    return <div className="h-9 w-9" aria-hidden />;
  }

  return (
    <button
      type="button"
      aria-label={isDark ? "עבור למצב בהיר" : "עבור למצב כהה"}
      onClick={() => {
        const next = !isDark;
        setIsDark(next);
        applyTheme(next ? "dark" : "light");
      }}
      className="flex h-9 w-9 items-center justify-center rounded-full text-text-secondary transition duration-200 hover:bg-surface-muted active:scale-85"
    >
      {isDark ? <Sun className="h-5 w-5" strokeWidth={2} /> : <Moon className="h-5 w-5" strokeWidth={2} />}
    </button>
  );
}
