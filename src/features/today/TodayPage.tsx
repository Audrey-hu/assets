import { useMemo } from "react";
import { CalendarDays, ChevronRight, Play, Plus, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, Progress, SectionHeader } from "@/components/ui/display";
import { CategoryBar, CategoryLegend } from "@/components/charts";
import { Money } from "@/components/ui/money";
import { useApp } from "@/store/app-store";
import { useEditors, useUI } from "@/store/ui-store";
import { useFocus } from "@/store/focus-store";
import {
  afterWorkLastDays,
  hobbyStats,
  journeyStats,
  monthSummary,
} from "@/lib/stats";
import { fmtDaysCount, fmtHours, fmtMinutes, fmtMoney, fmtRelativeDays } from "@/lib/format";
import { navigate } from "@/lib/router";
import { TIME_CATEGORY } from "@/lib/labels";
import { monthKey, weekdayLabel, monthDayLabel, todayISO } from "@/lib/format";
import type { Hobby, Journey } from "@/lib/types";

export function TodayPage() {
  const { data } = useApp();
  const { openModal } = useUI();
  const { newEvent, logTime } = useEditors();
  const { startFocus } = useFocus();

  const today = todayISO();
  const now = new Date();

  const todaysEvents = useMemo(
    () =>
      data.events
        .filter((e) => e.date === today)
        /* 没有具体时间的（例如事后补记的时长）排在最后 */
        .sort((a, b) => (a.startTime ?? "99:99").localeCompare(b.startTime ?? "99:99")),
    [data.events, today],
  );

  const summary = useMemo(() => monthSummary(data), [data]);
  const afterWork = useMemo(() => afterWorkLastDays(data, 7), [data]);

  const continueItems = useMemo(() => {
    const hobbies = data.hobbies
      .filter((h) => h.status === "active" || h.status === "deep" || h.status === "building")
      .map((hobby) => {
        const stats = hobbyStats(hobby.id, data);
        return {
          kind: "hobby" as const,
          hobby,
          stats,
          last: stats.lastSessionDate,
        };
      })
      .filter((item) => item.stats.sessions > 0);
    const journeys = data.journeys
      .filter((j) => j.status === "active")
      .map((journey) => {
        const stats = journeyStats(journey, data);
        return { kind: "journey" as const, journey, stats, last: stats.lastDate };
      });
    return [...hobbies, ...journeys]
      .sort((a, b) => (a.last && b.last ? (a.last < b.last ? 1 : -1) : a.last ? -1 : 1))
      .slice(0, 4);
  }, [data]);

  const afterWorkTotal = afterWork.slices.reduce((acc, s) => acc + s.minutes, 0);

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow="人生账本"
        title={weekdayLabel(now)}
        subtitle={
          <span className="flex items-center gap-2">
            <span>{monthDayLabel(now)}</span>
            <span className="text-border">·</span>
            <button
              type="button"
              onClick={() => navigate("#/calendar")}
              className="text-muted-foreground transition-colors hover:text-foreground lg:hidden"
            >
              日历
            </button>
            <span className="text-border lg:hidden">·</span>
            <button
              type="button"
              onClick={() => navigate(`#/review/${summary.monthKey}`)}
              className="text-muted-foreground transition-colors hover:text-foreground lg:hidden"
            >
              本月回顾
            </button>
          </span>
        }
        actions={
          <Button
            size="pill"
            variant="outline"
            className="hidden sm:inline-flex"
            onClick={() => openModal("focusSetup")}
          >
            <Play className="size-3.5" />
            Start a session
          </Button>
        }
      />

      {/* ------------------------------ Today ------------------------------ */}
      <section className="pt-5 lg:pt-0">
        <SectionHeader
          title="Today"
          hint={todaysEvents.length ? "今天的记录" : undefined}
          action={
            <Button
              size="pill"
              variant="ghost"
              className="text-muted-foreground"
              onClick={() => newEvent({ initial: { date: today } })}
            >
              <Plus className="size-3.5" />
              补记
            </Button>
          }
        />
        {todaysEvents.length === 0 ? (
          <Card className="px-2 py-4">
            <EmptyState
              icon={<Sparkles className="size-5" strokeWidth={1.6} />}
              title="今天还没有留下记录。"
              description="不着急。想起来的时候，从一次专注开始。"
              action={
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Button size="pill" onClick={() => openModal("focusSetup")}>
                    <Play className="size-3.5" />
                    Start a session
                  </Button>
                  <Button size="pill" variant="outline" onClick={() => logTime()}>
                    补记时长
                  </Button>
                </div>
              }
            />
          </Card>
        ) : (
          <Card className="row-divide overflow-hidden">
            {todaysEvents.map((event) => {
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
                  <div className="w-[86px] shrink-0 text-[12px] leading-tight text-muted-foreground numeral">
                    {event.startTime ? (
                      <>
                        <div>{event.startTime}</div>
                        <div className="text-muted-foreground/70">
                          {event.endTime ? `– ${event.endTime}` : ""}
                        </div>
                      </>
                    ) : (
                      <div>—</div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14.5px] font-medium text-foreground">
                      {event.title}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-[12px] text-muted-foreground">
                      {target && <span className="truncate">{target}</span>}
                      {event.timeCategory && !target && (
                        <span>{TIME_CATEGORY[event.timeCategory].label}</span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    {event.durationMin ? (
                      <div className="numeral text-[14px] font-medium text-foreground">
                        {fmtMinutes(event.durationMin, "short")}
                      </div>
                    ) : null}
                    {event.amount ? (
                      <div className="numeral mt-0.5 text-[12px] text-muted-foreground">
                        {fmtMoney(event.amount)}
                      </div>
                    ) : null}
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground/50" />
                </button>
              );
            })}
          </Card>
        )}
      </section>

      {/* ---------------------------- This Month --------------------------- */}
      <section className="pt-8">
        <SectionHeader
          title="This Month"
          action={
            <button
              type="button"
              onClick={() => navigate(`#/review/${summary.monthKey}`)}
              className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
            >
              {Number(monthKey(now).slice(5, 7))} 月回顾 →
            </button>
          }
        />
        <Card className="overflow-hidden">
          <div className="grid grid-cols-1 sm:grid-cols-[1.35fr_1fr]">
            <div className="border-b border-border/70 p-5 sm:border-b-0 sm:border-r">
              <div className="label-caps">时间投入</div>
              <div className="mt-2 numeral text-[38px] font-medium leading-none tracking-[-0.03em] text-foreground">
                {fmtHours(summary.minutes)}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[13px] text-muted-foreground">
                <span>{summary.sessions} 次记录</span>
                <span className="text-border">·</span>
                <span>
                  个人投入 <Money map={summary.invested} className="text-foreground" />
                </span>
              </div>
            </div>
            <div className="divide-y divide-border/70">
              <div className="flex items-center justify-between gap-4 px-5 py-3.5">
                <span className="text-[13px] text-muted-foreground">业余收入</span>
                <Money
                  map={summary.sideIncome}
                  className="text-[16px] font-medium text-primary"
                  stacked
                />
              </div>
              <div className="flex items-center justify-between gap-4 px-5 py-3.5">
                <span className="text-[13px] text-muted-foreground">新增资产</span>
                <span className="numeral text-[16px] font-medium text-foreground">
                  {summary.assetsCreated}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 px-5 py-3.5">
                <span className="text-[13px] text-muted-foreground">净收入</span>
                <Money
                  map={summary.netIncome}
                  className="text-[16px] font-medium text-foreground"
                  stacked
                />
              </div>
            </div>
          </div>
        </Card>
      </section>

      {/* ----------------------------- After Work -------------------------- */}
      <section className="pt-8">
        <SectionHeader
          title="After Work"
          hint="最近 7 天"
          action={
            <button
              type="button"
              onClick={() => navigate("#/ledger/time")}
              className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
            >
              时间账户 →
            </button>
          }
        />
        {afterWorkTotal === 0 ? (
          <Card className="px-2 py-2">
            <EmptyState
              icon={<CalendarDays className="size-5" strokeWidth={1.6} />}
              title="这周还没有下班后的记录。"
              description="用 Focus Timer 记一次，时间会自动进入这里。"
            />
          </Card>
        ) : (
          <Card className="space-y-4 p-5">
            <div className="flex items-baseline justify-between">
              <div className="numeral text-[26px] font-medium leading-none text-foreground">
                {fmtHours(afterWorkTotal)}
              </div>
              <span className="text-[12.5px] text-muted-foreground">
                合计 {afterWork.slices.length} 类
              </span>
            </div>
            <CategoryBar slices={afterWork.slices} />
            <CategoryLegend slices={afterWork.slices} />
          </Card>
        )}
      </section>

      {/* ------------------------------ Continue --------------------------- */}
      <section className="pt-8">
        <SectionHeader title="Continue" hint="正在进行的长期项目" />
        {continueItems.length === 0 ? (
          <Card className="px-2 py-2">
            <EmptyState
              title="还没有开始记录一个兴趣。"
              description="从一个你愿意做三年的事情开始。"
              action={
                <Button size="pill" onClick={() => openModal("hobby")}>
                  Create Your First Hobby
                </Button>
              }
            />
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {continueItems.map((item) =>
              item.kind === "hobby" ? (
                <HobbyContinueCard
                  key={item.hobby.id}
                  hobby={item.hobby}
                  stats={item.stats}
                  onStart={() =>
                    startFocus(
                      {
                        label: item.hobby.name,
                        hobbyId: item.hobby.id,
                        timeCategory: "hobby",
                      },
                      45,
                    )
                  }
                  onOpen={() => navigate(`#/hobby/${item.hobby.id}`)}
                />
              ) : (
                <JourneyContinueCard
                  key={item.journey.id}
                  journey={item.journey}
                  stats={item.stats}
                  nextGoal={
                    data.stages
                      .filter((s) => s.journeyId === item.journey.id && s.status !== "completed")
                      .sort((a, b) => a.order - b.order)[0]?.goal
                  }
                  onOpen={() => navigate(`#/journey/${item.journey.id}`)}
                />
              ),
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function HobbyContinueCard({
  hobby,
  stats,
  onOpen,
  onStart,
}: {
  hobby: Hobby;
  stats: ReturnType<typeof hobbyStats>;
  onOpen: () => void;
  onStart: () => void;
}) {
  return (
    <div className="surface flex flex-col gap-4 p-5 transition-colors hover:border-primary/25">
      <button type="button" onClick={onOpen} className="flex items-start gap-3 text-left">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-border/70 bg-secondary/50 text-[19px]">
          {hobby.icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15.5px] font-medium text-foreground">{hobby.name}</span>
          <span className="mt-0.5 block text-[12.5px] text-muted-foreground">
            {stats.lastSessionDate
              ? `上次练习 ${fmtRelativeDays(stats.lastSessionDate)}`
              : "还没有开始"}
          </span>
        </span>
      </button>
      <div className="flex items-end justify-between">
        <div>
          <div className="numeral text-[22px] font-medium leading-none text-foreground">
            {fmtHours(stats.minutes)}
          </div>
          <div className="mt-1 text-[12px] text-muted-foreground">
            {stats.sessions} sessions
          </div>
        </div>
        <Button
          size="pill"
          variant="subtle"
          onClick={(event) => {
            event.stopPropagation();
            onStart();
          }}
        >
          <Play className="size-3.5" />
          开始
        </Button>
      </div>
    </div>
  );
}

function JourneyContinueCard({
  journey,
  stats,
  nextGoal,
  onOpen,
}: {
  journey: Journey;
  stats: ReturnType<typeof journeyStats>;
  nextGoal?: string;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="surface flex w-full flex-col gap-4 p-5 text-left transition-colors hover:border-primary/25"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-[15.5px] font-medium text-foreground">{journey.name}</div>
          <div className="mt-0.5 text-[12.5px] text-muted-foreground">
            {fmtDaysCount(journey.startDate)} days
          </div>
        </div>
        <div className="text-right">
          <div className="numeral text-[22px] font-medium leading-none text-foreground">
            {fmtHours(stats.minutes)}
          </div>
          <Money map={stats.invested} compact className="mt-1 block text-[12px] text-muted-foreground" />
        </div>
      </div>
      <div className="space-y-2">
        <Progress value={stats.progress} height={5} />
        <div className="flex items-center justify-between text-[12px] text-muted-foreground">
          <span>
            Progress{" "}
            <span className="numeral text-foreground/80">
              {stats.completedStages}/{stats.totalStages}
            </span>
          </span>
          {stats.daysToTarget !== undefined && (
            <span className="numeral">{Math.max(0, stats.daysToTarget)} 天后</span>
          )}
        </div>
      </div>
      {nextGoal && (
        <div className="rounded-md border border-border/70 bg-secondary/40 px-3 py-2">
          <div className="label-caps">Next milestone</div>
          <div className="mt-1 line-clamp-2 text-[13px] text-foreground/90">{nextGoal}</div>
        </div>
      )}
    </button>
  );
}
