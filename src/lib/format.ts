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

/**
 * 全应用统一使用一种记账币种（在 Me → Preferences 里改）。
 *
 * 之所以做成模块级的「当前币种」而不是层层传参：涉及金额的地方太多了，
 * 少传一个就会出现「设置成美元、这里还显示 ¥」的不一致。
 * 组件都活在 AppProvider 之下，设置一改就整体重渲染，取到的就是新值。
 */
export const CURRENCIES = [
  { code: "CNY", symbol: "¥", label: "人民币 CNY" },
  { code: "USD", symbol: "$", label: "美元 USD" },
  { code: "EUR", symbol: "€", label: "欧元 EUR" },
  { code: "GBP", symbol: "£", label: "英镑 GBP" },
  { code: "JPY", symbol: "JP¥", label: "日元 JPY" },
  { code: "HKD", symbol: "HK$", label: "港币 HKD" },
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]["code"];

let activeCurrency: CurrencyCode = "CNY";

export function setActiveCurrency(code: CurrencyCode) {
  activeCurrency = code;
}

export function getActiveCurrency(): CurrencyCode {
  return activeCurrency;
}

export function currencySymbol(currency: string = activeCurrency) {
  return CURRENCIES.find((item) => item.code === currency)?.symbol ?? "¥";
}

/** 只有人民币和日元习惯用「万」，其它用 k */
function usesWan(currency: string) {
  return currency === "CNY" || currency === "JPY";
}

/* ------------------------- 多币种：分开算，不换算 ------------------------- */

/**
 * 不同币种的金额各自累加，形如 { CNY: 40140, USD: 2000 }。
 *
 * 我们不做汇率换算：汇率会变、来源也不可靠，硬凑成一个数字反而失真。
 * 汇总时按币种并列显示，你看到的就是"我手里有多少人民币、多少美元"。
 */
export type MoneyMap = Record<string, number>;

export function addMoney(
  map: MoneyMap,
  amount: number | null | undefined,
  currency?: string,
): MoneyMap {
  if (!amount) return map;
  const code = currency || getActiveCurrency();
  map[code] = (map[code] ?? 0) + amount;
  return map;
}

export function sumMoney(
  items: { amount: number | null | undefined; currency?: string }[],
): MoneyMap {
  const map: MoneyMap = {};
  for (const item of items) addMoney(map, item.amount, item.currency);
  return map;
}

export interface MoneyEntry {
  code: string;
  amount: number;
  text: string;
}

/** 按金额从大到小排好，过滤掉 0 */
export function moneyEntries(
  map: MoneyMap,
  options: { decimals?: number; compact?: boolean } = {},
): MoneyEntry[] {
  return Object.entries(map)
    .filter(([, value]) => Math.abs(value) > 0.004)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .map(([code, amount]) => ({
      code,
      amount,
      text: fmtMoney(amount, { currency: code, ...options }),
    }));
}

export function fmtMoneyMap(
  map: MoneyMap,
  options: { decimals?: number; compact?: boolean } = {},
  fallback = "—",
): string {
  const list = moneyEntries(map, options);
  return list.length ? list.map((item) => item.text).join(" · ") : fallback;
}

/** 只有一种币种时才返回金额，用于算比率（时薪、ROI 这类跨币种没有意义） */
export function singleCurrencyAmount(map: MoneyMap): number | undefined {
  const entries = Object.entries(map).filter(([, value]) => Math.abs(value) > 0.004);
  if (entries.length !== 1) return undefined;
  return entries[0][1];
}

export function isSingleCurrency(map: MoneyMap): boolean {
  return Object.keys(map).filter((code) => Math.abs(map[code]) > 0.004).length <= 1;
}

/** 金额最大的那个币种，用于曲线、里程碑这类只能取一个数的地方 */
export function dominantMoney(map: MoneyMap): { code: string; amount: number } | undefined {
  const entries = Object.entries(map).filter(([, value]) => Math.abs(value) > 0.004);
  if (!entries.length) return undefined;
  const [code, amount] = entries.sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))[0];
  return { code, amount };
}

export function hasMoney(map: MoneyMap): boolean {
  return Object.values(map).some((value) => Math.abs(value) > 0.004);
}

/** 两个同币种金额相除，跨币种返回 undefined */
export function safeRatio(numerator: MoneyMap, denominator: MoneyMap): number | undefined {
  if (!isSingleCurrency(numerator) || !isSingleCurrency(denominator)) return undefined;
  const top = singleCurrencyAmount(numerator);
  const bottom = singleCurrencyAmount(denominator);
  if (top === undefined || bottom === undefined || bottom === 0) return undefined;
  const sameCode =
    Object.keys(numerator).find((code) => Math.abs(numerator[code]) > 0.004) ===
    Object.keys(denominator).find((code) => Math.abs(denominator[code]) > 0.004);
  if (!sameCode) return undefined;
  return top / bottom;
}

export interface MoneyOptions {
  currency?: string;
  decimals?: number;
  compact?: boolean;
  signed?: boolean;
}

export function fmtMoney(amount: number, options: MoneyOptions = {}): string {
  const { currency = activeCurrency, decimals = 0, compact = false, signed = false } = options;
  const abs = Math.abs(amount);
  let body: string;
  if (compact && abs >= 10000) {
    if (usesWan(currency)) {
      const v = amount / 10000;
      body = `${trimZero(v.toFixed(abs >= 100000 ? 0 : 1))}万`;
    } else {
      const v = amount / 1000;
      body = `${trimZero(v.toFixed(abs >= 100000 ? 0 : 1))}k`;
    }
    return `${signed && amount > 0 ? "+" : amount < 0 ? "-" : ""}${currencySymbol(currency)}${body}`;
  }
  if (compact && abs >= 1000 && !usesWan(currency)) {
    const v = amount / 1000;
    return `${signed && amount > 0 ? "+" : amount < 0 ? "-" : ""}${currencySymbol(currency)}${trimZero(v.toFixed(1))}k`;
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
