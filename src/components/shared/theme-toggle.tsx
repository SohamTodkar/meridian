"use client";

import { Moon, Sun } from "lucide-react";
import { useState } from "react";

type Theme = "dark" | "light";

function currentTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => currentTheme());

  function toggleTheme() {
    const nextTheme: Theme = currentTheme() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem("ideas-theme", nextTheme);
    setTheme(nextTheme);
  }

  return <button className="theme-toggle" type="button" onClick={toggleTheme} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}><span>{theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}</span><span className="theme-toggle-label">Theme</span></button>;
}
