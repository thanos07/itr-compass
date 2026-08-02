"use client";

import { MoonStar, SunMedium } from "lucide-react";
import { useEffect, useState } from "react";

type Theme = "cream" | "blue";

export default function ThemeSwitcher() {
  const [theme, setTheme] = useState<Theme>("cream");

  useEffect(() => {
    const saved = (localStorage.getItem("itr-theme") as Theme | null) || "cream";
    setTheme(saved);
    document.documentElement.dataset.theme = saved;
  }, []);

  const change = (next: Theme) => {
    setTheme(next);
    localStorage.setItem("itr-theme", next);
    document.documentElement.dataset.theme = next;
  };

  return (
    <div
      className="flex items-center rounded-full border border-white/15 bg-white/5 p-1"
      role="group"
      aria-label="Theme variant"
    >
      <button
        type="button"
        onClick={() => change("cream")}
        aria-pressed={theme === "cream"}
        title="Cream theme"
        className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
          theme === "cream" ? "bg-cream text-navy" : "text-mist-soft hover:text-white"
        }`}
      >
        <SunMedium size={14} aria-hidden="true" />
        <span className="sr-only">Cream theme</span>
      </button>
      <button
        type="button"
        onClick={() => change("blue")}
        aria-pressed={theme === "blue"}
        title="Blue theme"
        className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
          theme === "blue" ? "bg-royal-light text-navy" : "text-mist-soft hover:text-white"
        }`}
      >
        <MoonStar size={14} aria-hidden="true" />
        <span className="sr-only">Blue theme</span>
      </button>
    </div>
  );
}
