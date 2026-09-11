import { Fragment } from "react";
import { Camera, Circle } from "lucide-react";
import { MOOD, EVENT_TYPE } from "@/lib/labels";
import { fmtDayShort, fmtMoney, fmtMinutes, fmtMonthLong } from "@/lib/format";
import { toDate } from "@/lib/format";
import type { LifeEvent } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PhotoGrid } from "./PhotoGrid";
import { Badge } from "./ui/display";

export function EventTimeline({
  events,
  onSelect,
  showMonth = true,
  className,
}: {
  events: LifeEvent[];
  onSelect?: (event: LifeEvent) => void;
  showMonth?: boolean;
  className?: string;
}) {
  const groups = new Map<string, LifeEvent[]>();
  for (const event of events) {
    const key = event.date.slice(0, 7);
    const bucket = groups.get(key) ?? [];
    bucket.push(event);
    groups.set(key, bucket);
  }
  const months = [...groups.keys()].sort((a, b) => (a < b ? 1 : -1));

  return (
    <div className={cn("space-y-7", className)}>
      {months.map((month) => (
        <section key={month}>
          {showMonth && (
            <h3 className="mb-3 text-[12px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              {fmtMonthLong(`${month}-01`)}
            </h3>
          )}
          <div className="relative space-y-1 pl-5">
            <span
              aria-hidden
              className="absolute bottom-2 left-[3px] top-2 w-px bg-border/80"
            />
            {(groups.get(month) ?? [])
              .slice()
              .sort((a, b) =>
                a.date === b.date
                  ? (a.startTime ?? "").localeCompare(b.startTime ?? "")
                  : a.date < b.date
                    ? 1
                    : -1,
              )
              .map((event) => (
                <Fragment key={event.id}>
                  <TimelineRow event={event} onSelect={onSelect} />
                </Fragment>
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function TimelineRow({
  event,
  onSelect,
}: {
  event: LifeEvent;
  onSelect?: (event: LifeEvent) => void;
}) {
  const amount = event.amount ?? 0;
  const isExpense = event.moneyType === "expense" || (event.type === "expense" && !event.moneyType);
  const isIncome = event.moneyType === "income" || (event.type === "income" && !event.moneyType);
  const score = typeof event.meta?.score === "number" ? Number(event.meta.score) : undefined;

  return (
    <div className="relative">
      <span className="absolute -left-5 top-4 grid size-[7px] place-items-center rounded-full bg-background">
        <Circle
          className={cn(
            "size-[7px]",
            event.type === "milestone" || event.type === "result"
              ? "fill-primary text-primary"
              : "fill-border text-border",
          )}
          strokeWidth={0}
        />
      </span>
      <button
        type="button"
        onClick={() => onSelect?.(event)}
        className={cn(
          "w-full rounded-lg px-3 py-3 text-left transition-colors",
          onSelect && "hover:bg-secondary/50",
        )}
      >
        <div className="flex items-baseline gap-2.5">
          <span className="w-[52px] shrink-0 text-[12px] text-muted-foreground numeral">
            {fmtDayShort(toDate(event.date))}
          </span>
          <span className="label-caps shrink-0">{EVENT_TYPE[event.type]}</span>
          <span className="flex-1" />
          {event.durationMin ? (
            <span className="shrink-0 text-[13px] font-medium numeral text-foreground">
              {fmtMinutes(event.durationMin, "short")}
            </span>
          ) : null}
          {amount > 0 && (
            <span
              className={cn(
                "shrink-0 text-[13px] font-medium numeral",
                isIncome ? "text-primary" : isExpense ? "text-foreground/75" : "text-foreground/75",
              )}
            >
              {isExpense ? "−" : isIncome ? "+" : ""}
              {fmtMoney(amount, { currency: "CNY" })}
            </span>
          )}
        </div>
        <div className="mt-1.5 pl-[62px]">
          <p className="text-[14.5px] leading-snug text-foreground">{event.title}</p>
          {(event.startTime || score !== undefined || event.mood || event.person) && (
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12px] text-muted-foreground">
              {event.startTime && (
                <span className="numeral">
                  {event.startTime}
                  {event.endTime ? `–${event.endTime}` : ""}
                </span>
              )}
              {score !== undefined && <Badge tone="accent">得分 {score}</Badge>}
              {event.person && <span>{event.person}</span>}
              {event.mood && (
                <span className="inline-flex items-center gap-1">
                  <span aria-hidden>{MOOD[event.mood].emoji}</span>
                  {MOOD[event.mood].label}
                </span>
              )}
              {event.photoIds?.length > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Camera className="size-3.5" />
                  {event.photoIds.length}
                </span>
              )}
            </div>
          )}
          {event.note && (
            <p className="mt-2 border-l-2 border-border pl-3 text-[13px] leading-relaxed text-muted-foreground">
              {event.note}
            </p>
          )}
          {event.photoIds?.length > 0 && (
            <div className="mt-2.5 max-w-md">
              <PhotoGrid ids={event.photoIds} columns={event.photoIds.length === 1 ? 1 : 3} />
            </div>
          )}
        </div>
      </button>
    </div>
  );
}
