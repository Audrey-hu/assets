import { useMemo, useState } from "react";
import { MoreHorizontal, NotebookPen, Pencil, Play, Plus } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import {
  Badge,
  Card,
  EmptyState,
  Progress,
  SectionHeader,
  Segmented,
} from "@/components/ui/display";
import { SimpleLineChart, TrendChart } from "@/components/charts";
import { EventTimeline } from "@/components/EventTimeline";
import { Money } from "@/components/ui/money";
import { useApp } from "@/store/app-store";
import { useEditors, useUI } from "@/store/ui-store";
import { useFocus } from "@/store/focus-store";
import { journeyStats, journeyTrend, stageStats } from "@/lib/stats";
import { fmtDate, fmtDaysCount, fmtHours, fmtMonthLong } from "@/lib/format";
import { JOURNEY_KIND, STAGE_PHASE, STAGE_STATUS } from "@/lib/labels";
import { differenceInCalendarDays } from "date-fns";
import { cn } from "@/lib/utils";
import type { Journey } from "@/lib/types";

type Metric = "minutes" | "money" | "sessions" | "score";

const METRIC_LABEL: Record<Metric, string> = {
  minutes: "累计时间",
  money: "累计花费",
  sessions: "学习频率",
  score: "模考成绩",
};

export function JourneyDetailPage({ journeyId }: { journeyId: string }) {
  const { data } = useApp();
  const { openModal } = useUI();
  const { newExpense, newNote, logTime } = useEditors();
  const { startFocus } = useFocus();
  const [metric, setMetric] = useState<Metric>("minutes");

  const journey = data.journeys.find((j) => j.id === journeyId);
  const stages = useMemo(
    () =>
      data.stages
        .filter((s) => s.journeyId === journeyId)
        .sort((a, b) => a.order - b.order || (a.startDate ?? "").localeCompare(b.startDate ?? "")),
    [data.stages, journeyId],
  );
  const events = useMemo(
    () => data.events.filter((e) => e.journeyId === journeyId),
    [data.events, journeyId],
  );
  const stats = useMemo(() => (journey ? journeyStats(journey, data) : null), [journey, data]);
  const trend = useMemo(
    () => (journey ? journeyTrend(data, journey.id, metric) : []),
    [data, journey, metric],
  );

  if (!journey || !stats) {
    return (
      <div className="animate-fade-up">
        <PageHeader title="Journey" back="#/journey" />
        <Card className="mt-4 px-2 py-2">
          <EmptyState title="这段 Journey 已经不在了。" />
        </Card>
      </div>
    );
  }

  return (
    <div className="animate-fade-up">
      <PageHeader
        back="#/journey"
        eyebrow={JOURNEY_KIND[journey.kind]}
        title={journey.name}
        subtitle={journey.description}
        actions={
          <Button
            size="icon"
            variant="outline"
            aria-label="编辑"
            className="rounded-full"
            onClick={() => openModal("journey", { initial: journey })}
          >
            <MoreHorizontal className="size-4" />
          </Button>
        }
      />

      {/* long arc */}
      <div className="pt-5 lg:pt-0">
        <JourneyArc journey={journey} />
      </div>

      {/* core stats */}
      <div className="grid grid-cols-2 gap-3 pt-4 sm:grid-cols-4">
        <StatTile label="Days on journey" value={String(stats.days)} />
        <StatTile label="Time invested" value={fmtHours(stats.minutes)} />
        <StatTile label="Money invested" value={<Money map={stats.invested} compact />} />
        <StatTile label="Sessions" value={String(stats.sessions)} />
      </div>

      <div className="flex flex-wrap gap-2 pt-4">
        <Button
          size="pill"
          onClick={() =>
            startFocus(
              {
                label: journey.name,
                journeyId: journey.id,
                stageId: stages.find((s) => s.status === "active")?.id,
                timeCategory: journey.kind === "networking" ? "social" : "growth",
              },
              45,
            )
          }
        >
          <Play className="size-3.5" />
          Study Session
        </Button>
        <Button size="pill" variant="outline" onClick={() => logTime({ journeyId: journey.id })}>
          <NotebookPen className="size-3.5" />
          补记时长
        </Button>
        <Button size="pill" variant="outline" onClick={() => newExpense({ initial: { journeyId: journey.id } })}>
          记一笔支出
        </Button>
        <Button
          size="pill"
          variant="outline"
          onClick={() => openModal("event", { initial: { journeyId: journey.id }, lockType: "result" })}
        >
          记录成绩
        </Button>
        <Button
          size="pill"
          variant="outline"
          onClick={() => openModal("event", { initial: { journeyId: journey.id }, lockType: "decision" })}
        >
          计划调整
        </Button>
        <Button size="pill" variant="outline" onClick={() => newNote({ initial: { journeyId: journey.id } })}>
          反思
        </Button>
      </div>

      {/* trend */}
      <section className="pt-8">
        <SectionHeader
          title="长期曲线"
          action={
            <div className="w-full max-w-[300px]">
              <Segmented
                size="sm"
                value={metric}
                onChange={setMetric}
                options={[
                  { value: "minutes", label: "时间" },
                  { value: "money", label: "花费" },
                  { value: "sessions", label: "频率" },
                  { value: "score", label: "成绩" },
                ]}
              />
            </div>
          }
        />
        <Card className="p-4 pt-5">
          {metric === "score" ? (
            <SimpleLineChart
              data={trend}
              color="#8A8298"
              formatter={(value) => `${value}%`}
              yDomain={[0, 100]}
            />
          ) : (
            <TrendChart
              data={trend}
              color="#3F5F4E"
              formatter={(value) =>
                metric === "money"
                  ? `${Math.round(value / 1000)}k`
                  : metric === "minutes"
                    ? `${Math.round(value / 60)}h`
                    : String(value)
              }
            />
          )}
          <p className="mt-3 text-[12px] text-muted-foreground">
            {METRIC_LABEL[metric]} · 共 {trend.length} 个数据点
          </p>
        </Card>
      </section>

      {/* stages */}
      <section className="pt-8">
        <SectionHeader
          title="Stages"
          hint={stages.length ? `已完成 ${stats.completedStages} / ${stages.length}` : "把长期目标切成可完成的小段"}
          action={
            <Button
              size="pill"
              variant="ghost"
              className="text-muted-foreground"
              onClick={() => openModal("stage", { journeyId: journey.id })}
            >
              <Plus className="size-3.5" />
              新增阶段
            </Button>
          }
        />
        {stages.length === 0 ? (
          <Card className="px-5 py-6 text-center text-[13px] text-muted-foreground">
            还没有阶段。建议从「基础」「系统学习」「强化」开始。
          </Card>
        ) : (
          <div className="space-y-3">
            {stages.map((stage, index) => {
              const st = stageStats(stage, data);
              return (
                <Card key={stage.id} className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="numeral text-[12px] text-muted-foreground">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span className="text-[15px] font-medium text-foreground">
                          {STAGE_PHASE[stage.phase]}
                        </span>
                        <Badge tone={stage.status === "completed" ? "accent" : "muted"}>
                          {STAGE_STATUS[stage.status]}
                        </Badge>
                      </div>
                      {stage.goal && (
                        <p className="mt-1.5 text-[13.5px] leading-relaxed text-foreground/85">{stage.goal}</p>
                      )}
                      <p className="mt-1 text-[12px] text-muted-foreground">
                        {stage.startDate ? fmtDate(stage.startDate) : "—"}
                        {stage.endDate ? ` → ${fmtDate(stage.endDate)}` : ""}
                        {stage.status === "completed" && st.days > 0 ? ` · ${st.days} 天` : ""}
                      </p>
                    </div>
                    <Button
                      size="iconSm"
                      variant="ghost"
                      aria-label="编辑阶段"
                      onClick={() => openModal("stage", { initial: stage, journeyId: journey.id })}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                  </div>
                  <div className="mt-3.5 space-y-2">
                    <Progress value={stage.progress} tone={journey.accent} height={5} />
                    <div className="flex items-center justify-between text-[12px] text-muted-foreground">
                      <span className="numeral">{stage.progress}%</span>
                      <span className="numeral">
                        {fmtHours(st.minutes)} · {st.sessions} 次
                        {Object.keys(st.invested).length > 0 ? (
                          <>
                            {" · "}
                            <Money map={st.invested} compact />
                          </>
                        ) : null}
                      </span>
                    </div>
                  </div>
                  {stage.status === "completed" && (
                    <div className="mt-3.5 rounded-md border border-primary/15 bg-accent/40 px-3 py-2.5">
                      <div className="label-caps text-primary/80">Stage Summary</div>
                      <p className="mt-1 text-[12.5px] text-foreground/80">
                        {STAGE_PHASE[stage.phase]} Completed · {st.days} 天 · {fmtHours(st.minutes)} ·{" "}
                        <Money map={st.invested} />
                      </p>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <section className="pt-8">
        <SectionHeader title="Timeline" hint={`${events.length} 条记录`} />
        {events.length === 0 ? (
          <Card className="px-2 py-2">
            <EmptyState title="这段旅程还没有记录。" description="第一次学习之后，这里会开始有内容。" />
          </Card>
        ) : (
          <EventTimeline events={events} onSelect={(event) => openModal("event", { initial: event })} />
        )}
      </section>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="surface px-4 py-3.5">
      <div className="label-caps">{label}</div>
      <div className="mt-2 numeral text-[24px] font-medium leading-none text-foreground">{value}</div>
    </div>
  );
}

function JourneyArc({ journey }: { journey: Journey }) {
  const start = new Date(journey.startDate);
  const target = journey.targetDate ? new Date(journey.targetDate) : null;
  const today = new Date();
  const total = target ? Math.max(1, differenceInCalendarDays(target, start)) : 0;
  const passed = Math.max(0, differenceInCalendarDays(today, start));
  const pct = target ? Math.min(100, (passed / total) * 100) : 100;

  return (
    <Card className="px-5 py-5">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <div className="label-caps">Started</div>
          <div className="mt-1 text-[14px] text-foreground">{fmtMonthLong(start)}</div>
        </div>
        {target && (
          <div className="text-right">
            <div className="label-caps">{journey.kind === "exam" ? "Exam" : "Target"}</div>
            <div className="mt-1 text-[14px] text-foreground">{fmtMonthLong(target)}</div>
          </div>
        )}
      </div>

      <div className="relative mt-6">
        <div className="h-[3px] w-full rounded-full bg-secondary">
          <div className="h-full rounded-full bg-primary/70" style={{ width: `${pct}%` }} />
        </div>
        <span className="absolute -top-[5px] left-0 size-[13px] rounded-full border-2 border-background bg-primary/60" />
        {target && (
          <span className="absolute -top-[5px] right-0 size-[13px] rounded-full border-2 border-background bg-border" />
        )}
        <span
          className="absolute -top-[7px] size-[17px] -translate-x-1/2 rounded-full border-[3px] border-background bg-primary shadow-[0_0_0_1px_hsl(var(--primary))]"
          style={{ left: `${pct}%` }}
        >
          <span className="absolute inset-0 animate-ping rounded-full bg-primary/25" />
        </span>
        <div
          className="absolute -translate-x-1/2 pt-3 text-center"
          style={{ left: `${Math.min(88, Math.max(12, pct))}%` }}
        >
          <div className="text-[11.5px] font-medium text-primary">Today</div>
        </div>
      </div>

      <div className={cn("mt-8 flex items-center justify-between text-[12px] text-muted-foreground")}>
        <span className="numeral">{fmtDaysCount(journey.startDate)} days in</span>
        {target && (
          <span className="numeral">
            {Math.max(0, differenceInCalendarDays(target, today))} days to go
          </span>
        )}
      </div>
    </Card>
  );
}
