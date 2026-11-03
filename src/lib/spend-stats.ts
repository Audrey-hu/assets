/**
 * 分类开销的统计。
 *
 * 只做两件事：把「这个月花在每一类上的钱」算清楚，把它和上个月放在一起看。
 * 所有金额都按币种分开累加，任何地方都不做汇率折算 —— 和账本其他部分一致。
 */

import {
  addMoney,
  dominantMoney,
  getActiveCurrency,
  monthKey,
  safeRatio,
  todayISO,
  type MoneyMap,
} from "./format";
import type { SpendCategory, SpendEntry } from "./types";

export interface SpendTagStat {
  tag: string;
  month: MoneyMap;
  count: number;
}

export interface SpendCategoryStat {
  category: SpendCategory;
  /** 本月 */
  month: MoneyMap;
  /** 上月 */
  previous: MoneyMap;
  /** 最近几个月（含本月）的月均 */
  average: MoneyMap;
  count: number;
  totalCount: number;
  /** 本月占全部开销的比例；跨币种时无法给出 */
  share?: number;
  /** 预算用了多少（0.82 = 82%）；没设预算时为空 */
  budgetUsed?: number;
  tags: SpendTagStat[];
}

export interface SpendTrendPoint {
  month: string;
  label: string;
  total: MoneyMap;
}

export interface SpendOverview {
  month: string;
  total: MoneyMap;
  previous: MoneyMap;
  count: number;
  daysElapsed: number;
  daily: MoneyMap;
  /** 本月里有多少是从储蓄里出的 */
  fromSavings: MoneyMap;
  /** 同币种环比（0.12 = 比上月多花 12%）；跨币种没有意义，返回 undefined */
  change?: number;
  categories: SpendCategoryStat[];
  trend: SpendTrendPoint[];
  /** 出现过的币种，金额大的在前 */
  currencies: string[];
  /** 记录指向了已删除分类的数量 */
  orphanCount: number;
}

export function monthOf(date: string | undefined): string {
  if (!date) return "";
  const key = date.slice(0, 7);
  return /^\d{4}-\d{2}$/.test(key) ? key : "";
}

export function shiftMonth(month: string, delta: number): string {
  const [year, monthNumber] = month.split("-").map(Number);
  const total = year * 12 + (monthNumber - 1) + delta;
  const y = Math.floor(total / 12);
  const m = total - y * 12 + 1;
  return `${y}-${String(m).padStart(2, "0")}`;
}

export function monthLabel(month: string): string {
  const [, m] = month.split("-").map(Number);
  return `${m}月`;
}

function entryMoney(entry: SpendEntry): { amount: number; currency: string } {
  return {
    amount: entry.amount ?? 0,
    currency: entry.currency ?? getActiveCurrency(),
  };
}

/** 一组记录按币种合计 */
export function sumEntries(entries: SpendEntry[]): MoneyMap {
  const map: MoneyMap = {};
  for (const entry of entries) {
    const { amount, currency } = entryMoney(entry);
    addMoney(map, amount, currency);
  }
  return map;
}

/** 某个月的总开销 */
export function spendMonthTotal(entries: SpendEntry[], month: string): MoneyMap {
  return sumEntries(entries.filter((entry) => monthOf(entry.date) === month));
}

function averageOf(entries: SpendEntry[], months: string[]): MoneyMap {
  const map: MoneyMap = {};
  for (const month of months) {
    for (const entry of entries) {
      if (monthOf(entry.date) !== month) continue;
      const { amount, currency } = entryMoney(entry);
      addMoney(map, amount, currency);
    }
  }
  for (const code of Object.keys(map)) map[code] = map[code] / Math.max(1, months.length);
  return map;
}

function tagStats(entries: SpendEntry[]): SpendTagStat[] {
  const groups = new Map<string, SpendEntry[]>();
  for (const entry of entries) {
    const tag = entry.tag?.trim() || "未细分";
    const list = groups.get(tag);
    if (list) list.push(entry);
    else groups.set(tag, [entry]);
  }
  return [...groups.entries()]
    .map(([tag, list]) => ({ tag, month: sumEntries(list), count: list.length }))
    .sort((a, b) => {
      const av = dominantMoney(a.month)?.amount ?? 0;
      const bv = dominantMoney(b.month)?.amount ?? 0;
      if (bv !== av) return bv - av;
      return a.tag.localeCompare(b.tag);
    });
}

/**
 * 一个月的全貌：总额、环比、分类排行、细分标签、近 N 个月趋势。
 */
export function spendOverview(
  categories: SpendCategory[],
  entries: SpendEntry[],
  options: { month?: string; months?: number; today?: string } = {},
): SpendOverview {
  const monthsBack = Math.max(1, options.months ?? 6);
  const today = options.today ?? todayISO();
  const month = options.month ?? monthKey(today);
  const previousMonth = shiftMonth(month, -1);
  const history = Array.from({ length: monthsBack }, (_, index) =>
    shiftMonth(month, index - (monthsBack - 1)),
  );

  const thisMonthEntries = entries.filter((entry) => monthOf(entry.date) === month);
  const total = sumEntries(thisMonthEntries);
  const fromSavings = sumEntries(thisMonthEntries.filter((entry) => Boolean(entry.savingsItemId)));
  const previous = spendMonthTotal(entries, previousMonth);

  const knownIds = new Set(categories.map((category) => category.id));
  const categoriesStats: SpendCategoryStat[] = categories.map((category) => {
    const own = entries.filter((entry) => entry.categoryId === category.id);
    const ownThisMonth = own.filter((entry) => monthOf(entry.date) === month);
    const budgetCurrency = category.budgetCurrency ?? getActiveCurrency();
    const budget = category.monthlyBudget ?? 0;
    return {
      category,
      month: sumEntries(ownThisMonth),
      previous: sumEntries(own.filter((entry) => monthOf(entry.date) === previousMonth)),
      average: averageOf(own, history),
      count: ownThisMonth.length,
      totalCount: own.length,
      share: safeRatio(sumEntries(ownThisMonth), total),
      budgetUsed: budget > 0 ? (sumEntries(ownThisMonth)[budgetCurrency] ?? 0) / budget : undefined,
      tags: tagStats(ownThisMonth),
    };
  });

  categoriesStats.sort((a, b) => {
    const av = dominantMoney(a.month)?.amount ?? 0;
    const bv = dominantMoney(b.month)?.amount ?? 0;
    if (bv !== av) return bv - av;
    const ap = dominantMoney(a.previous)?.amount ?? 0;
    const bp = dominantMoney(b.previous)?.amount ?? 0;
    if (bp !== ap) return bp - ap;
    return a.category.name.localeCompare(b.category.name);
  });

  const trend: SpendTrendPoint[] = history.map((key) => ({
    month: key,
    label: monthLabel(key),
    total: spendMonthTotal(entries, key),
  }));

  const currencies = [...new Set(entries.map((entry) => entryMoney(entry).currency))].sort((a, b) => {
    const av = Object.entries(total).find(([code]) => code === a)?.[1] ?? 0;
    const bv = Object.entries(total).find(([code]) => code === b)?.[1] ?? 0;
    if (bv !== av) return bv - av;
    return a.localeCompare(b);
  });

  const day = Number(today.slice(8, 10));
  const daysElapsed = month === monthKey(today) ? Math.max(1, day) : 0;
  const daily: MoneyMap = {};
  if (daysElapsed > 0) {
    for (const [code, amount] of Object.entries(total)) daily[code] = amount / daysElapsed;
  }

  const change = safeRatio(total, previous);

  return {
    month,
    total,
    previous,
    count: thisMonthEntries.length,
    daysElapsed,
    daily,
    fromSavings,
    change: change === undefined ? undefined : change - 1,
    categories: categoriesStats,
    trend,
    currencies,
    orphanCount: entries.filter((entry) => !knownIds.has(entry.categoryId)).length,
  };
}

/** 类别卡片上用的「本月 vs 上月」百分比 */
export function monthChange(current: MoneyMap, previous: MoneyMap): number | undefined {
  const ratio = safeRatio(current, previous);
  return ratio === undefined ? undefined : ratio - 1;
}
