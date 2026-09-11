import {
  differenceInCalendarDays,
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
} from "date-fns";

export function toDate(value: string | Date): Date {
  return typeof value === "string" ? parseISO(value) : value;
}

/** 2026.09.10 */
export function fmtDate(value: string | Date): string {
  return format(toDate(value), "yyyy.MM.dd");
}

/** Sep 10 */
export function fmtDayShort(value: string | Date): string {
  return format(toDate(value), "LLL d");
}

/** September 2026 */
export function fmtMonthLong(value: string | Date): string {
  return format(toDate(value), "LLLL yyyy");
}

/** 2026-09 */
export function monthKey(value: string | Date): string {
  return format(toDate(value), "yyyy-MM");
}

export function monthKeyToDate(key: string): Date {
  return parseISO(`${key}-01`);
}

export function monthBounds(value: string | Date) {
  const d = toDate(value);
  return { start: startOfMonth(d), end: endOfMonth(d) };
}

export function fmtDateLong(value: string | Date): string {
  return format(toDate(value), "EEEE, LLLL d, yyyy");
}

/** 20:10 – 20:55 */
export function fmtTimeRange(start?: string, end?: string): string {
  if (start && end) return `${start} – ${end}`;
  if (start) return start;
  return "";
}

export function currencySymbol(currency = "CNY") {
  switch (currency) {
    case "CNY":
      return "¥";
    case "USD":
      return "$";
    case "EUR":
      return "€";
    case "GBP":
      return "£";
    case "JPY":
      return "¥";
    default:
      return "¥";
  }
}

export interface MoneyOptions {
  currency?: string;
  decimals?: number;
  compact?: boolean;
  signed?: boolean;
}

export function fmtMoney(amount: number, options: MoneyOptions = {}): string {
  const { currency = "CNY", decimals = 0, compact = false, signed = false } = options;
  const abs = Math.abs(amount);
  let body: string;
  if (compact && abs >= 10000) {
    const v = amount / 10000;
    body = `${trimZero(v.toFixed(abs >= 100000 ? 0 : 1))}万`;
    return `${signed && amount > 0 ? "+" : amount < 0 ? "-" : ""}${currencySymbol(currency)}${body}`;
  }
  body = trimZero(
    abs.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }),
  );
  const sign = amount < 0 ? "-" : signed && amount > 0 ? "+" : "";
  return `${sign}${currencySymbol(currency)}${body}`;
}

function trimZero(v: string) {
  return v.includes(".") ? v.replace(/\.?0+$/, "") : v;
}

/** 1h 20m / 45 min */
export function fmtMinutes(minutes: number, style: "long" | "short" = "long"): string {
  const m = Math.max(0, Math.round(minutes));
  const h = Math.floor(m / 60);
  const rest = m % 60;
  if (style === "short") {
    if (h === 0) return `${rest}m`;
    if (rest === 0) return `${h}h`;
    return `${h}h ${rest}m`;
  }
  if (h === 0) return `${rest} min`;
  if (rest === 0) return `${h}h`;
  return `${h}h ${rest}min`;
}

/** 68h — headline style */
export function fmtHours(minutes: number, decimals = 1): string {
  const h = minutes / 60;
  if (h === 0) return "0h";
  if (h < 10) return `${trimZero(h.toFixed(decimals))}h`;
  return `${Math.round(h)}h`;
}

export function fmtDurationHM(minutes: number): { h: string; m: string } {
  const m = Math.max(0, Math.round(minutes));
  return { h: String(Math.floor(m / 60)), m: String(m % 60).padStart(2, "0") };
}

/** "今天" / "3 days ago" — deliberately gentle, never guilt-inducing. */
export function fmtRelativeDays(date: string | Date): string {
  const days = differenceInCalendarDays(new Date(), toDate(date));
  if (days <= 0) return "今天";
  if (days === 1) return "昨天";
  if (days < 30) return `${days} 天前`;
  if (days < 365) return `${Math.round(days / 30)} 个月前`;
  return `${(days / 365).toFixed(1)} 年前`;
}

export function fmtDaysCount(date: string | Date): number {
  return Math.max(0, differenceInCalendarDays(new Date(), toDate(date)));
}

export function fmtDurationFromTo(start: string | Date, end: string | Date): string {
  const days = differenceInCalendarDays(toDate(end), toDate(start));
  if (days < 0) return "—";
  const y = Math.floor(days / 365);
  const m = Math.round((days % 365) / 30);
  if (y > 0 && m > 0) return `${y}y ${m}m`;
  if (y > 0) return `${y}y`;
  if (m > 0) return `${m}m`;
  return `${days}d`;
}

export function hoursFromMinutes(minutes: number) {
  return Math.round((minutes / 60) * 10) / 10;
}

export function nowHHmm(date = new Date()) {
  return format(date, "HH:mm");
}

export function todayISO(date = new Date()) {
  return format(date, "yyyy-MM-dd");
}

export function minutesBetween(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const diff = eh * 60 + em - (sh * 60 + sm);
  return diff < 0 ? diff + 24 * 60 : diff;
}

export function weekdayLabel(date: string | Date) {
  return format(toDate(date), "EEEE");
}

export function monthDayLabel(date: string | Date) {
  return format(toDate(date), "LLLL d");
}

export function weekdayShort(date: string | Date) {
  return format(toDate(date), "EEEEE");
}
