import {
  addDays,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfDay,
  endOfMonth,
  isWithinInterval,
  parseISO,
  startOfMonth,
  subDays,
} from "date-fns";
import {
  monthKey as toMonthKey,
  toDate,
  todayISO,
} from "./format";
import type {
  Asset,
  Course,
  Hobby,
  ID,
  IncomeProject,
  Journey,
  LifeEvent,
  SavingsItem,
  SavingsSnapshot,
  SavingsTx,
  Stage,
  TimeCategory,
} from "./types";
import { sum } from "./utils";

export interface Dataset {
  hobbies: Hobby[];
  journeys: Journey[];
  stages: Stage[];
  events: LifeEvent[];
  courses: Course[];
  incomes: IncomeProject[];
  assets: Asset[];
  savings: SavingsItem[];
  savingsTx: SavingsTx[];
  snapshots: SavingsSnapshot[];
}

export function eventMinutes(e: LifeEvent): number {
  if (e.type !== "session" && e.type !== "meeting") return 0;
  return Math.max(0, e.durationMin ?? 0);
}

export function eventExpense(e: LifeEvent): number {
  const amount = e.amount ?? 0;
  if (!amount) return 0;
  const kind = e.moneyType ?? (e.type === "expense" ? "expense" : undefined);
  return kind === "expense" ? amount : 0;
}

export function eventIncome(e: LifeEvent): number {
  const amount = e.amount ?? 0;
  if (!amount) return 0;
  const kind = e.moneyType ?? (e.type === "income" ? "income" : undefined);
  return kind === "income" ? amount : 0;
}

export function isSession(e: LifeEvent) {
  return eventMinutes(e) > 0;
}

export function inferTimeCategory(
  e: LifeEvent,
  hobbies: Hobby[] = [],
  journeys: Journey[] = [],
): TimeCategory {
  if (e.timeCategory) return e.timeCategory;
  if (e.type === "meeting") return "social";
  if (e.type === "reflection" || e.type === "note") return "other";
  if (e.hobbyId) {
    const hobby = hobbies.find((h) => h.id === e.hobbyId);
    if (hobby?.name.match(/健身|跑步|游泳|瑜伽|运动/)) return "health";
    return "hobby";
  }
  if (e.journeyId) {
    const journey = journeys.find((j) => j.id === e.journeyId);
    if (journey?.kind === "networking") return "social";
    if (journey?.kind === "content" || journey?.kind === "career") return "sideproject";
    return "growth";
  }
  return "other";
}

export function eventsBetween(events: LifeEvent[], start: Date, end: Date) {
  return events.filter((e) => {
    const d = parseISO(e.date);
    return isWithinInterval(d, { start, end });
  });
}

export function eventsInMonth(events: LifeEvent[], monthKey: string) {
  return events.filter((e) => e.date.startsWith(monthKey));
}

/* ------------------------------- Hobby ------------------------------- */

export interface HobbyStats {
  minutes: number;
  sessions: number;
  invested: number;
  costPerHour: number;
  lastSessionDate?: string;
  firstSessionDate?: string;
  photos: ID[];
  monthly: { month: string; minutes: number; sessions: number; invested: number }[];
}

export function hobbyStats(hobbyId: ID, dataset: Dataset): HobbyStats {
  const events = dataset.events.filter((e) => e.hobbyId === hobbyId);
  const sessions = events.filter(isSession);
  const minutes = sum(sessions.map(eventMinutes));
  const invested = sum(events.map(eventExpense));
  const photos = events.flatMap((e) => e.photoIds ?? []);
  const months = new Map<string, { minutes: number; sessions: number; invested: number }>();
  for (const e of events) {
    const key = e.date.slice(0, 7);
    const bucket = months.get(key) ?? { minutes: 0, sessions: 0, invested: 0 };
    bucket.minutes += eventMinutes(e);
    bucket.sessions += isSession(e) ? 1 : 0;
    bucket.invested += eventExpense(e);
    months.set(key, bucket);
  }
  const sorted = sessions.map((s) => s.date).sort();
  return {
    minutes,
    sessions: sessions.length,
    invested,
    costPerHour: minutes > 0 ? invested / (minutes / 60) : 0,
    lastSessionDate: sorted.at(-1),
    firstSessionDate: sorted[0],
    photos,
    monthly: [...months.entries()]
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([month, v]) => ({ month, ...v })),
  };
}

export function hobbySessionsThisWeek(hobbyId: ID, dataset: Dataset, weekStartsOn = 1) {
  const now = new Date();
  const start = startOfWeekLocal(now, weekStartsOn);
  const events = dataset.events.filter(
    (e) => e.hobbyId === hobbyId && isSession(e) && parseISO(e.date) >= start,
  );
  return {
    sessions: events.length,
    minutes: sum(events.map(eventMinutes)),
  };
}

export function startOfWeekLocal(date: Date, weekStartsOn = 1) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day - weekStartsOn + 7) % 7;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/* ------------------------------ Journey ------------------------------ */

export interface JourneyStats {
  minutes: number;
  sessions: number;
  invested: number;
  days: number;
  daysToTarget?: number;
  progress: number;
  completedStages: number;
  totalStages: number;
  lastDate?: string;
}

export function journeyStats(journey: Journey, dataset: Dataset): JourneyStats {
  const events = dataset.events.filter((e) => e.journeyId === journey.id);
  const sessions = events.filter(isSession);
  const stages = dataset.stages
    .filter((s) => s.journeyId === journey.id)
    .sort((a, b) => a.order - b.order);
  const completed = stages.filter((s) => s.status === "completed").length;
  const days = Math.max(0, differenceInCalendarDays(new Date(), toDate(journey.startDate)));
  const dates = events.map((e) => e.date).sort();
  return {
    minutes: sum(sessions.map(eventMinutes)),
    sessions: sessions.length,
    invested: sum(events.map(eventExpense)),
    days,
    daysToTarget: journey.targetDate
      ? differenceInCalendarDays(toDate(journey.targetDate), new Date())
      : undefined,
    progress: stages.length ? Math.round((completed / stages.length) * 100) : 0,
    completedStages: completed,
    totalStages: stages.length,
    lastDate: dates.at(-1),
  };
}

export function stageStats(stage: Stage, dataset: Dataset) {
  const events = dataset.events.filter((e) => e.stageId === stage.id);
  const sessions = events.filter(isSession);
  const days = stage.startDate
    ? Math.max(
        0,
        differenceInCalendarDays(
          stage.endDate ? toDate(stage.endDate) : new Date(),
          toDate(stage.startDate),
        ),
      )
    : 0;
  return {
    minutes: sum(sessions.map(eventMinutes)),
    sessions: sessions.length,
    invested: sum(events.map(eventExpense)),
    days,
  };
}

/* ------------------------------ Month -------------------------------- */

export interface MonthSummary {
  monthKey: string;
  minutes: number;
  sessions: number;
  invested: number;
  sideIncome: number;
  netIncome: number;
  assetsCreated: number;
  topExpense?: { title: string; amount: number };
  mostTime?: { name: string; minutes: number; href: string };
  mostConsistent?: { name: string; sessions: number; href: string };
  days: { date: string; sessions: number }[];
}

export function monthSummary(dataset: Dataset, key = toMonthKey(new Date())): MonthSummary {
  const events = eventsInMonth(dataset.events, key);
  const sessions = events.filter(isSession);
  const incomes = dataset.incomes.filter((i) => i.date.startsWith(key));
  const assets = dataset.assets.filter((a) => a.createdDate.startsWith(key));

  const expenseTotals = new Map<string, number>();
  for (const e of events) {
    const amount = eventExpense(e);
    if (amount > 0) {
      expenseTotals.set(e.title, (expenseTotals.get(e.title) ?? 0) + amount);
    }
  }
  const topExpenseEntry = [...expenseTotals.entries()].sort((a, b) => b[1] - a[1])[0];

  const byTarget = new Map<string, { name: string; minutes: number; href: string }>();
  for (const e of sessions) {
    const target = e.hobbyId
      ? dataset.hobbies.find((h) => h.id === e.hobbyId)
      : e.journeyId
        ? dataset.journeys.find((j) => j.id === e.journeyId)
        : undefined;
    if (!target) continue;
    const href = e.hobbyId ? `#/hobby/${target.id}` : `#/journey/${target.id}`;
    const entry = byTarget.get(target.id) ?? { name: target.name, minutes: 0, href };
    entry.minutes += eventMinutes(e);
    byTarget.set(target.id, entry);
  }
  const mostTime = [...byTarget.values()].sort((a, b) => b.minutes - a.minutes)[0];

  const countByTarget = new Map<string, { name: string; sessions: number; href: string }>();
  for (const e of sessions) {
    const target = e.hobbyId
      ? dataset.hobbies.find((h) => h.id === e.hobbyId)
      : e.journeyId
        ? dataset.journeys.find((j) => j.id === e.journeyId)
        : undefined;
    if (!target) continue;
    const href = e.hobbyId ? `#/hobby/${target.id}` : `#/journey/${target.id}`;
    const entry = countByTarget.get(target.id) ?? { name: target.name, sessions: 0, href };
    entry.sessions += 1;
    countByTarget.set(target.id, entry);
  }
  const mostConsistent = [...countByTarget.values()].sort((a, b) => b.sessions - a.sessions)[0];

  const dayCount = new Map<string, number>();
  for (const e of sessions) dayCount.set(e.date, (dayCount.get(e.date) ?? 0) + 1);

  return {
    monthKey: key,
    minutes: sum(sessions.map(eventMinutes)),
    sessions: sessions.length,
    invested: sum(events.map(eventExpense)),
    sideIncome: sum(incomes.map((i) => i.revenue)),
    netIncome: sum(incomes.map((i) => i.revenue - i.cost)),
    assetsCreated: assets.length,
    topExpense: topExpenseEntry ? { title: topExpenseEntry[0], amount: topExpenseEntry[1] } : undefined,
    mostTime,
    mostConsistent,
    days: [...dayCount.entries()]
      .sort()
      .map(([date, sessions]) => ({ date, sessions })),
  };
}

/* ---------------------------- After work ----------------------------- */

export interface CategorySlice {
  category: TimeCategory;
  minutes: number;
  share: number;
}

export function categoryBreakdown(
  dataset: Dataset,
  start: Date,
  end: Date = endOfDay(new Date()),
): CategorySlice[] {
  const events = eventsBetween(dataset.events, start, end).filter(isSession);
  const totals = new Map<TimeCategory, number>();
  for (const e of events) {
    const c = inferTimeCategory(e, dataset.hobbies, dataset.journeys);
    totals.set(c, (totals.get(c) ?? 0) + eventMinutes(e));
  }
  const total = sum([...totals.values()]);
  return [...totals.entries()]
    .map(([category, minutes]) => ({
      category,
      minutes,
      share: total > 0 ? minutes / total : 0,
    }))
    .sort((a, b) => b.minutes - a.minutes);
}

export function afterWorkLastDays(dataset: Dataset, days = 7) {
  const end = endOfDay(new Date());
  const start = subDays(end, days - 1);
  return { start, end, slices: categoryBreakdown(dataset, start, end) };
}

export function dailyBuckets(dataset: Dataset, start: Date, end: Date) {
  const map = new Map<
    string,
    { growth: boolean; hobby: boolean; income: boolean; milestone: boolean; minutes: number }
  >();
  for (const day of eachDayOfInterval({ start, end })) {
    map.set(todayISO(day), {
      growth: false,
      hobby: false,
      income: false,
      milestone: false,
      minutes: 0,
    });
  }
  for (const e of dataset.events) {
    const bucket = map.get(e.date);
    if (!bucket) continue;
    bucket.minutes += eventMinutes(e);
    if (e.type === "milestone" || e.type === "result" || e.type === "document") bucket.milestone = true;
    if (e.moneyType === "income" || e.type === "income") bucket.income = true;
    const category = inferTimeCategory(e, dataset.hobbies, dataset.journeys);
    if (e.type === "meeting" || category === "social") bucket.hobby = bucket.hobby || false;
    if (e.hobbyId || category === "hobby" || category === "health") bucket.hobby = true;
    if (e.journeyId || category === "growth" || category === "sideproject") bucket.growth = true;
  }
  return map;
}

/* ------------------------------ Savings ------------------------------ */

export interface SavingsTotals {
  available: number;
  locked: number;
  total: number;
  liquidity: number;
  emergency?: SavingsItem;
  reservoir?: SavingsItem;
  runwayMonths: number;
  runwayTarget: number;
  runwayProgress: number;
}

export const SAVINGS_MILESTONES = [50_000, 100_000, 300_000, 500_000, 1_000_000];

export function savingsTotals(items: SavingsItem[]): SavingsTotals {
  const reservoir = items.find((i) => i.kind === "reservoir");
  const emergency = items.find((i) => i.kind === "emergency");
  const deposits = items.filter((i) => i.kind === "deposit");
  const available = (reservoir?.current ?? 0) + (emergency?.current ?? 0);
  const locked = sum(deposits.map((d) => d.principal ?? 0));
  const total = available + locked;
  const monthly = reservoir?.monthlyEssential ?? 0;
  const runwayMonths = monthly > 0 ? (reservoir?.current ?? 0) / monthly : 0;
  const runwayTarget = reservoir?.target ?? 0;
  return {
    available,
    locked,
    total,
    liquidity: total > 0 ? available / total : 0,
    emergency,
    reservoir,
    runwayMonths,
    runwayTarget: monthly > 0 ? runwayTarget / monthly : 0,
    runwayProgress:
      runwayTarget > 0 ? Math.min(1, (reservoir?.current ?? 0) / runwayTarget) : 0,
  };
}

export function expectedInterest(item: SavingsItem): number {
  const principal = item.principal ?? 0;
  const rate = item.rate ?? 0;
  const term = item.termMonths ?? 12;
  return (principal * (rate / 100) * term) / 12;
}

export function maturityList(items: SavingsItem[]) {
  return items
    .filter((i) => i.kind === "deposit" && i.maturityDate)
    .sort((a, b) => (a.maturityDate! < b.maturityDate! ? -1 : 1));
}

export function savingTxFor(itemId: ID, txs: SavingsTx[]) {
  return txs
    .filter((t) => t.itemId === itemId)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function savingsSeries(snapshots: SavingsSnapshot[], currentTotal: number) {
  const rows = [...snapshots]
    .sort((a, b) => (a.month < b.month ? -1 : 1))
    .map((s) => ({
      month: s.month,
      label: `${Number(s.month.slice(5, 7))}月`,
      total: s.total,
    }));
  const key = toMonthKey(new Date());
  const idx = rows.findIndex((r) => r.month === key);
  if (idx >= 0) rows[idx].total = currentTotal;
  else rows.push({ month: key, label: `${Number(key.slice(5, 7))}月`, total: currentTotal });
  return rows;
}

/* ------------------------------ Income ------------------------------- */

export function incomeStats(projects: IncomeProject[]) {
  const revenue = sum(projects.map((p) => p.revenue));
  const cost = sum(projects.map((p) => p.cost));
  const minutes = sum(projects.map((p) => p.minutes));
  const net = revenue - cost;
  return {
    revenue,
    cost,
    net,
    minutes,
    hourly: minutes > 0 ? net / (minutes / 60) : 0,
  };
}

export function incomeProjectStats(p: IncomeProject) {
  const net = p.revenue - p.cost;
  return {
    net,
    hourly: p.minutes > 0 ? net / (p.minutes / 60) : 0,
  };
}

/* ------------------------------- Assets ------------------------------ */

export function assetValue(a: Asset) {
  return { minutes: a.minutes, cost: a.cost, income: a.incomeGenerated };
}

export function calendarMonthGrid(month: Date, weekStartsOn = 1) {
  const start = startOfMonth(month);
  const end = endOfMonth(month);
  const gridStart = startOfWeekLocal(start, weekStartsOn);
  const totalDays = Math.ceil((differenceInCalendarDays(end, gridStart) + 1) / 7) * 7;
  return Array.from({ length: totalDays }, (_, i) => addDays(gridStart, i));
}

export function recentPhotoEvents(dataset: Dataset, limit = 60) {
  return dataset.events
    .filter((e) => (e.photoIds?.length ?? 0) > 0)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, limit);
}

export function searchAll(dataset: Dataset, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const results: {
    kind: string;
    id: string;
    title: string;
    subtitle: string;
    href: string;
    date?: string;
  }[] = [];

  for (const h of dataset.hobbies) {
    if (matches(q, h.name, h.note)) {
      results.push({ kind: "兴趣", id: h.id, title: h.name, subtitle: "Hobby", href: `#/hobby/${h.id}` });
    }
  }
  for (const j of dataset.journeys) {
    if (matches(q, j.name, j.description, j.note)) {
      results.push({ kind: "成长", id: j.id, title: j.name, subtitle: "Journey", href: `#/journey/${j.id}` });
    }
  }
  for (const e of dataset.events) {
    if (matches(q, e.title, e.note, e.person, e.date)) {
      results.push({
        kind: eventTypeLabel(e.type),
        id: e.id,
        title: e.title,
        subtitle: e.note ?? e.date,
        href: e.hobbyId ? `#/hobby/${e.hobbyId}` : e.journeyId ? `#/journey/${e.journeyId}` : "#/today",
        date: e.date,
      });
    }
  }
  for (const i of dataset.incomes) {
    if (matches(q, i.name, i.note)) {
      results.push({ kind: "业余收入", id: i.id, title: i.name, subtitle: "Side income", href: "#/ledger/income", date: i.date });
    }
  }
  for (const a of dataset.assets) {
    if (matches(q, a.name, a.note)) {
      results.push({ kind: "沉淀资产", id: a.id, title: a.name, subtitle: "Asset", href: `#/assets/${a.id}` });
    }
  }
  for (const s of dataset.savings) {
    if (matches(q, s.name, s.bank, s.note)) {
      results.push({ kind: "存款", id: s.id, title: s.name, subtitle: s.bank ?? "Savings", href: "#/ledger/savings" });
    }
  }
  return results.slice(0, 40);
}

function matches(q: string, ...fields: (string | undefined)[]) {
  return fields.some((f) => f && f.toLowerCase().includes(q));
}

export function eventTypeLabel(type: LifeEvent["type"]) {
  const map: Record<LifeEvent["type"], string> = {
    session: "记录",
    expense: "支出",
    income: "收入",
    milestone: "里程碑",
    result: "成果",
    reflection: "反思",
    feedback: "反馈",
    decision: "决定",
    document: "文件",
    note: "笔记",
    meeting: "会面",
  };
  return map[type];
}

export function findHobbyOrJourneyName(e: LifeEvent, dataset: Dataset) {
  if (e.hobbyId) return dataset.hobbies.find((h) => h.id === e.hobbyId)?.name;
  if (e.journeyId) return dataset.journeys.find((j) => j.id === e.journeyId)?.name;
  return undefined;
}

export function courseStats(course: Course) {
  const remaining = Math.max(0, course.totalLessons - course.completedLessons);
  return {
    remaining,
    perLesson: course.totalLessons > 0 ? course.totalPrice / course.totalLessons : 0,
    utilisation: course.totalLessons > 0 ? course.completedLessons / course.totalLessons : 0,
  };
}

export function journeyTrend(dataset: Dataset, journeyId: ID, metric: "minutes" | "money" | "sessions" | "score") {
  const events = dataset.events.filter((e) => e.journeyId === journeyId);
  const months = new Map<string, { minutes: number; money: number; sessions: number }>();
  for (const e of events) {
    const key = e.date.slice(0, 7);
    const b = months.get(key) ?? { minutes: 0, money: 0, sessions: 0 };
    b.minutes += eventMinutes(e);
    b.money += eventExpense(e);
    b.sessions += isSession(e) ? 1 : 0;
    months.set(key, b);
  }
  const keys = [...months.keys()].sort();

  if (metric === "score") {
    return events
      .filter((e) => e.type === "result" && typeof e.meta?.score === "number")
      .sort((a, b) => (a.date < b.date ? -1 : 1))
      .map((e) => ({ label: e.date.slice(5).replace("-", "/"), value: Number(e.meta?.score) }));
  }

  let running = 0;
  return keys.map((k) => {
    const b = months.get(k)!;
    if (metric === "minutes") running += b.minutes;
    if (metric === "money") running += b.money;
    if (metric === "sessions") running += b.sessions;
    return { label: `${Number(k.slice(5, 7))}月`, value: running };
  });
}
