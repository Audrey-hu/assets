import { useMemo, useState } from "react";
import { addMonths, format, startOfMonth, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, SectionHeader } from "@/components/ui/display";
import { useApp } from "@/store/app-store";
import { useUI } from "@/store/ui-store";
import { calendarMonthGrid, dailyBuckets } from "@/lib/stats";
import { fmtDate, fmtMinutes, fmtMonthLong, todayISO } from "@/lib/format";
import { TIME_CATEGORY } from "@/lib/labels";
import { cn } from "@/lib/utils";

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
              onClick={() => setMonth((prev) => subMonths(prev, 1))}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              size="iconSm"
              variant="ghost"
              aria-label="下个月"
              onClick={() => setMonth((prev) => addMonths(prev, 1))}
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
