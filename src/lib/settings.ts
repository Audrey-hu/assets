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
  /*
   * 默认不灌示例数据。
   *
   * 以前的默认值是 true：任何人第一次打开链接（新设备、清过缓存、别人的电脑）
   * 都会看到一整套"示例记录"。那些内容其实是照着自己的生活写的假数据，
   * 所以很容易被误会成"我的数据被别人看到了"，或者"删掉的记录又回来了"。
   * 现在默认空白；想看界面长什么样，到「我的 → 重新开始 → 载入示例数据」手动载入。
   */
  seedDemo: false,
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
