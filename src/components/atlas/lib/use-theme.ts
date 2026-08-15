"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "sla-theme";

export type Theme = "light" | "dark";

/** Mirrors the pre-paint script in the root layout; never reads during render. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
    setMounted(true);
  }, []);

  const apply = useCallback((next: Theme) => {
    document.documentElement.classList.toggle("dark", next === "dark");
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Private browsing: the in-memory theme is still correct for this session.
    }
    setTheme(next);
  }, []);

  const toggle = useCallback(() => {
    apply(document.documentElement.classList.contains("dark") ? "light" : "dark");
  }, [apply]);

  return { theme, mounted, setTheme: apply, toggle };
}
