import { useCallback, useEffect, useState } from "react";

const KEY = "sg-site-theme";
export type ThemeMode = "light" | "dark";

/**
 *
 */
function readInitial(): ThemeMode {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(KEY) as ThemeMode | null;
  if (stored === "dark" || stored === "light") return stored;
  return "light";
}

/**
 *
 */
export function useTheme() {
  const [theme, setTheme] = useState<ThemeMode>(readInitial);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      window.localStorage.setItem(KEY, theme);
    } catch {
      // localStorage may be unavailable (privacy mode) — ignore.
    }
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }, []);

  return { theme, toggle };
}
