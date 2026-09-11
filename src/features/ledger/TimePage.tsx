import { useMemo } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, SectionHeader } from "@/components/ui/display";
import { CategoryBar, CategoryLegend, TrendChart } from "@/components/charts";
import { useApp } from "@/store/app-store";
import { useEditors, useUI } from "@/store/ui-store";
import { categoryBreakdown, eventsBetween, inferTimeCategory, startOfWeekLocal } from "@/lib/stats";
import { fmtHours, fmtMinutes, fmtRelativeDays } from "@/lib/format";
import { TIME_CATEGORY } from "@/lib/labels";
import { subDays, endOfDay, startOfDay, format } from "date-fns";

const QUICK_MINUTES = [30, 60, 90, 120, 180];

export function TimePage() {
  const { data } = useApp();
  const { logTime } = useEditors();
  const { openModal } = useUI();

  const now = new Date();
  const weekStart = useMemo(() => startOfWeekLocal(now, 1), [now]);
  const weekSlices = useMemo(
    () => categoryBreakdown(data, weekStart, endOfDay(now)),
    [data, weekStart, now],
  );
  const weekTotal = weekSlices.reduce((acc, s) => acc + s.minutes, 0);

  const last30 = useMemo(() => {
    const start = startOfDay(subDays(now, 29));
    const events = eventsBetween(data.events, start, endOfDay(now)).filter(
      (e) => e.type === "session" && (e.durationMin ?? 0) > 0,
    );
    const byDay = new Map<string, number>();
    for (let i = 29; i >= 0; i--) byDay.set(format(subDays(now, i), "yyyy-MM-dd"), 0);
    for (const event of events) byDay.set(event.date, (byDay.get(event.date) ?? 0) + (event.durationMin ?? 0));
    return [...byDay.entries()].map(([date, minutes]) => ({
      label: date.slice(8),
      value: Math.round((minutes / 60) * 10) / 10,
    }));
  }, [data.events, now]);

  const recent = useMemo(
    () =>
      data.events
        .filter((e) => e.type === "session" && (e.durationMin ?? 0) > 0)
        .sort((a, b) => (a.date < b.date ? 1 : -1))
        .slice(0, 14),
    [data.events],
  );

  const avgPerDay = last30.reduce((acc, row) => acc + row.value, 0) / 30;

  return (
    <div className="space-y-8">
      <Card className="p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="label-caps">This Week</div>
            <div className="mt-2 numeral text-[34px] font-medium leading-none tracking-[-0.03em] text-foreground">
              {fmtHours(weekTotal)}
            </div>
          </div>
          <div className="text-right">
            <div className="label-caps">近 30 天日均</div>
            <div className="mt-2 numeral text-[20px] font-medium text-foreground">
              {avgPerDay.toFixed(1)}h
            </div>
          </div>
        </div>
        {weekTotal > 0 && (
          <div className="mt-5 space-y-4">
            <CategoryBar slices={weekSlices} />
            <CategoryLegend slices={weekSlices} />
          </div>
        )}
      </Card>

      <section>
        <SectionHeader title="快速记录" hint="下班后的时间，手动补一笔也可以" />
        <div className="flex flex-wrap gap-2">
          {QUICK_MINUTES.map((minutes) => (
            <Button
              key={minutes}
              size="pill"
              variant="outline"
              onClick={() => logTime({ durationMin: minutes })}
            >
              + {minutes >= 60 ? `${minutes / 60}h` : `${minutes}m`}
            </Button>
          ))}
          <Button
            size="pill"
            variant="ghost"
            className="text-muted-foreground"
            onClick={() => logTime()}
          >
            <Plus className="size-3.5" />
            自定义
          </Button>
        </div>
      </section>

      <section>
        <SectionHeader title="近 30 天" hint="每天投入的小时数" />
        <Card className="p-4 pt-5">
          <TrendChart data={last30} color="#6B7C90" formatter={(value) => `${value}h`} height={150} yWidth={34} />
        </Card>
      </section>

      <section>
        <SectionHeader title="最近的时间记录" />
        {recent.length === 0 ? (
          <Card className="px-2 py-2">
            <EmptyState title="还没有时间记录。" description="用 Focus Timer 开始第一次。" />
          </Card>
        ) : (
          <Card className="row-divide overflow-hidden">
            {recent.map((event) => {
              const category = inferTimeCategory(event, data.hobbies, data.journeys);
              const target =
                data.hobbies.find((h) => h.id === event.hobbyId)?.name ??
                data.journeys.find((j) => j.id === event.journeyId)?.name;
              return (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => openModal("event", { initial: event })}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/40"
                >
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: TIME_CATEGORY[category].hex }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] text-foreground">{event.title}</span>
                    <span className="mt-0.5 block text-[12px] text-muted-foreground">
                      {fmtRelativeDays(event.date)}
                      {target ? ` · ${target}` : ""}
                      {` · ${TIME_CATEGORY[category].label}`}
                    </span>
                  </span>
                  <span className="numeral shrink-0 text-[13.5px] font-medium text-foreground">
                    {fmtMinutes(event.durationMin ?? 0, "short")}
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
