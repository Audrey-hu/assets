import { safeParse } from "./utils";
import type { Settings } from "./types";

const SETTINGS_KEY = "lifeledger.settings.v1";

export const defaultSettings: Settings = {
  displayName: "",
  currency: "CNY",
  dateFormat: "YYYY.MM.DD",
  theme: "light",
  weekStartsOn: 1,
  demoSeeded: false,
};

export function loadSettings(): Settings {
  if (typeof localStorage === "undefined") return defaultSettings;
  const raw = localStorage.getItem(SETTINGS_KEY);
  if (!raw) return defaultSettings;
  return { ...defaultSettings, ...(safeParse<Partial<Settings>>(raw) ?? {}) };
}

export function saveSettings(settings: Settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* storage full or unavailable — the app keeps working in memory */
  }
}

export function applyTheme(theme: Settings["theme"]) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", theme === "dark" ? "#161513" : "#F7F5F0");
}
