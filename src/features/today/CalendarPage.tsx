import { useMemo, useState, type ReactNode } from "react";
import { addMonths, endOfMonth, format, startOfMonth, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, SectionHeader } from "@/components/ui/display";
import { CategoryBar, CategoryLegend } from "@/components/charts";
import { Money } from "@/components/ui/money";
import { useApp } from "@/store/app-store";
import { useUI } from "@/store/ui-store";
import { calendarMonthGrid, categoryBreakdown, dailyBuckets, monthSummary } from "@/lib/stats";
import { spendOverview } from "@/lib/spend-stats";
import { fmtDate, fmtHours, fmtMinutes, fmtMonthLong, todayISO } from "@/lib/format";
import { TIME_CATEGORY } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { navigate } from "@/lib/router";

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];

export function CalendarPage() {
  const { data, settings } = useApp();
  const { openModal } = useUI();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState(todayISO());

  const days = useMemo(
    () => calendarMonthGrid(month, settings.weekStartsOn),
    [month, settings.weekStartsOn],
  );
  const buckets = useMemo(
    () => dailyBuckets(data, days[0], days[days.length - 1]),
    [data, days],
  );

  const selectedEvents = useMemo(
    () =>
      data.events
        .filter((e) => e.date === selected)
        .sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? "")),
    [data.events, selected],
  );

  const monthKeyStr = format(month, "yyyy-MM");
  const summary = useMemo(() => monthSummary(data, monthKeyStr), [data, monthKeyStr]);
  const previousSummary = useMemo(
    () => monthSummary(data, format(subMonths(month, 1), "yyyy-MM")),
    [data, month],
  );
  const slices = useMemo(
    () => categoryBreakdown(data, startOfMonth(month), endOfMonth(month)),
    [data, month],
  );
  const spending = useMemo(
    () => spendOverview(data.spendCategories, data.spendEntries, { month: monthKeyStr }),
    [data.spendCategories, data.spendEntries, monthKeyStr],
  );

  /* 本月 vs 上月的时间差，用一句话说清楚 */
  const deltaMinutes = summary.minutes - previousSummary.minutes;

  const year = month.getFullYear();
  const yearMonths = useMemo(
    () =>
      Array.from({ length: 12 }, (_, index) => {
        const key = `${year}-${String(index + 1).padStart(2, "0")}`;
        const s = monthSummary(data, key);
        return { key, label: `${index + 1} 月`, minutes: s.minutes, sessions: s.sessions };
      }),
    [data, year],
  );

  /** 切月份时，把选中日也挪到那个月（有记录就选第一条，没有就选 1 号） */
  function goToMonth(next: Date) {
    const start = startOfMonth(next);
    setMonth(start);
    const key = format(start, "yyyy-MM");
    const firstEvent = [...data.events]
      .filter((event) => event.date.startsWith(key))
      .sort((a, b) => (a.date < b.date ? -1 : 1))[0];
    setSelected(firstEvent?.date ?? format(start, "yyyy-MM-dd"));
  }

  return (
    <div className="animate-fade-up">
      <PageHeader
        back
        title="Calendar"
        subtitle="回顾生活，而不是管理日程"
        searchable={false}
        actions={
          <div className="flex items-center gap-1">
            <Button
              size="iconSm"
              variant="ghost"
              aria-label="上个月"
              onClick={() => goToMonth(subMonths(month, 1))}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              size="iconSm"
              variant="ghost"
              aria-label="下个月"
              onClick={() => goToMonth(addMonths(month, 1))}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        }
      />

      <Card className="p-4 pt-3.5">
        <div className="flex items-center justify-between px-1 pb-3">
          <span className="text-[15px] font-medium text-foreground">{fmtMonthLong(month)}</span>
          <button
            type="button"
            onClick={() => {
              setMonth(startOfMonth(new Date()));
              setSelected(todayISO());
            }}
            className="text-[12.5px] text-muted-foreground transition-colors hover:text-foreground"
          >
            回到今天
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {WEEKDAYS.map((day) => (
            <div key={day} className="pb-1 text-center text-[11px] text-muted-foreground">
              {day}
            </div>
          ))}
          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const bucket = buckets.get(key);
            const isCurrentMonth = day.getMonth() === month.getMonth();
            const isToday = key === todayISO();
            const isSelected = key === selected;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelected(key)}
                className={cn(
                  "flex aspect-square flex-col items-center justify-center gap-1 rounded-md text-[13px] transition-colors",
                  isSelected ? "bg-primary text-primary-foreground" : "hover:bg-secondary/70",
                  !isCurrentMonth && "opacity-35",
                )}
              >
                <span
                  className={cn(
                    "numeral leading-none",
                    isToday && !isSelected && "font-semibold text-primary",
                  )}
                >
                  {format(day, "d")}
                </span>
                <span className="flex h-1.5 items-center gap-[3px]">
                  {bucket?.growth && (
                    <span className={cn("size-1 rounded-full", isSelected ? "bg-primary-foreground" : "bg-primary")} />
                  )}
                  {bucket?.hobby && (
                    <span
                      className={cn("size-1 rounded-full", isSelected ? "bg-primary-foreground/80" : "bg-[#87A083]")}
                    />
                  )}
                  {bucket?.income && (
                    <span
                      className={cn("size-1 rounded-full", isSelected ? "bg-primary-foreground/80" : "bg-[#A9765A]")}
                    />
                  )}
                  {bucket?.milestone && (
                    <span
                      className={cn("size-1 rounded-full", isSelected ? "bg-primary-foreground/80" : "bg-[#8A8298]")}
                    />
                  )}
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-border/70 pt-3 text-[11.5px] text-muted-foreground">
          <Legend color="#3F5F4E" label="Growth" />
          <Legend color="#87A083" label="Hobby" />
          <Legend color="#A9765A" label="Side Income" />
          <Legend color="#8A8298" label="Milestone" />
        </div>
      </Card>

      {/* --------------------------- 本月总结 --------------------------- */}
      <section className="pt-7">
        <SectionHeader
          title="本月总结"
          hint={fmtMonthLong(month)}
          action={
            <button
              type="button"
              onClick={() => navigate(`#/review/${monthKeyStr}`)}
              className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
            >
              完整回顾 →
            </button>
          }
        />
        <Card className="p-5">
          <div className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3">
            <Metric
              label="时间投入"
              value={fmtHours(summary.minutes)}
              sub={`${summary.sessions} 次记录`}
            />
            <Metric
              label="与上月"
              value={
                deltaMinutes === 0
                  ? "持平"
                  : `${deltaMinutes > 0 ? "+" : "−"}${fmtHours(Math.abs(deltaMinutes))}`
              }
              sub={
                previousSummary.minutes === 0
                  ? "上月没有记录"
                  : `上月 ${fmtHours(previousSummary.minutes)}`
              }
            />
            <Metric
              label="个人投入"
              value={<Money map={summary.invested} fallback="—" />}
              sub="长期项目里的花费"
            />
            <Metric
              label="分类开销"
              value={<Money map={spending.total} fallback="—" />}
              sub={spending.count ? `${spending.count} 笔` : "还没有记录"}
            />
            <Metric
              label="业余收入"
              value={<Money map={summary.sideIncome} fallback="—" />}
            />
            <Metric label="新增资产" value={String(summary.assetsCreated)} />
          </div>

          {slices.length > 0 && (
            <div className="mt-5 space-y-3 border-t border-border/70 pt-4">
              <div className="flex items-center justify-between">
                <span className="label-caps">时间构成</span>
                <span className="text-[12px] text-muted-foreground">
                  {slices.length} 类
                </span>
              </div>
              <CategoryBar slices={slices} />
              <CategoryLegend slices={slices} />
            </div>
          )}

          {summary.mostTime && (
            <p className="mt-4 border-t border-border/70 pt-3 text-[12.5px] text-muted-foreground">
              本月最投入：
              <span className="text-foreground/85">
                {summary.mostTime.name} · {fmtHours(summary.mostTime.minutes)}
              </span>
              {summary.mostConsistent && (
                <>
                  <span className="mx-2 text-border">·</span>
                  最持续：<span className="text-foreground/85">{summary.mostConsistent.name}</span>
                </>
              )}
            </p>
          )}
        </Card>
      </section>

      {/* --------------------------- 月度总览 --------------------------- */}
      <section className="pt-7">
        <SectionHeader title="月度总览" hint={`${year} 年`} />
        <Card className="grid grid-cols-3 overflow-hidden sm:grid-cols-4 lg:grid-cols-6">
          {yearMonths.map((item) => {
            const active = item.key === monthKeyStr;
            const empty = item.sessions === 0 && item.minutes === 0;
            const future = item.key > format(new Date(), "yyyy-MM");
            return (
              <button
                key={item.key}
                type="button"
                onClick={() =>
                  goToMonth(
                    new Date(Number(item.key.slice(0, 4)), Number(item.key.slice(5, 7)) - 1, 1),
                  )
                }
                className={cn(
                  "flex flex-col items-start gap-1 border-b border-r border-border/60 px-3.5 py-3 text-left transition-colors last:border-r-0 hover:bg-secondary/40",
                  active && "bg-secondary/60",
                )}
              >
                <span
                  className={cn(
                    "text-[12px]",
                    active ? "font-medium text-foreground" : "text-muted-foreground",
                  )}
                >
                  {item.label}
                </span>
                <span
                  className={cn(
                    "numeral text-[15px] font-medium",
                    empty ? "text-muted-foreground/60" : "text-foreground",
                  )}
                >
                  {empty ? "—" : fmtHours(item.minutes)}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {future ? "未到" : empty ? "无记录" : `${item.sessions} 次`}
                </span>
              </button>
            );
          })}
        </Card>
      </section>

      <section className="pt-7">
        <SectionHeader
          title={fmtDate(selected)}
          hint={selectedEvents.length ? `${selectedEvents.length} 条记录` : undefined}
        />
        {selectedEvents.length === 0 ? (
          <Card className="px-2 py-2">
            <EmptyState title="这一天没有记录。" description="空白的日子也是生活的一部分。" />
          </Card>
        ) : (
          <Card className="row-divide overflow-hidden">
            {selectedEvents.map((event) => {
              const target =
                data.hobbies.find((h) => h.id === event.hobbyId)?.name ??
                data.journeys.find((j) => j.id === event.journeyId)?.name;
              return (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => openModal("event", { initial: event })}
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-secondary/40"
                >
                  <span className="w-[52px] shrink-0 text-[12.5px] text-muted-foreground numeral">
                    {event.startTime ?? "—"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] text-foreground">{event.title}</span>
                    <span className="mt-0.5 block truncate text-[12px] text-muted-foreground">
                      {target ?? (event.timeCategory ? TIME_CATEGORY[event.timeCategory].label : "")}
                    </span>
                  </span>
                  <span className="numeral shrink-0 text-[13px] text-muted-foreground">
                    {event.durationMin ? fmtMinutes(event.durationMin, "short") : ""}
                  </span>
                </button>
              );
            })}
          </Card>
        )}
      </section>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="size-1.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

function Metric({
  label,
  value,
  sub,
}: {
  label: string;
  value: ReactNode;
  sub?: string;
}) {
  return (
    <div>
      <div className="text-[11.5px] text-muted-foreground">{label}</div>
      <div className="mt-1 numeral text-[18px] font-medium leading-tight text-foreground">
        {value}
      </div>
      {sub && <div className="mt-0.5 text-[11.5px] text-muted-foreground">{sub}</div>}
    </div>
  );
}
