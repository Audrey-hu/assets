import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function uid(prefix = "id"): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 12)
      : Math.random().toString(36).slice(2, 14);
  return `${prefix}_${Date.now().toString(36)}${rand}`;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function sum(values: number[]) {
  return values.reduce((acc, v) => acc + v, 0);
}

export function groupBy<T>(items: T[], key: (item: T) => string) {
  return items.reduce<Record<string, T[]>>((acc, item) => {
    const k = key(item);
    (acc[k] ||= []).push(item);
    return acc;
  }, {});
}

/** Stable, pleasant ordering for grouped timelines. */
export function sortByDateDesc<T extends { date: string }>(items: T[]) {
  return [...items].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

export function download(filename: string, contents: string | Blob) {
  const blob =
    typeof contents === "string"
      ? new Blob([contents], { type: "application/json" })
      : contents;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function safeParse<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
