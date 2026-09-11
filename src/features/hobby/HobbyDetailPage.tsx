import { useMemo } from "react";
import { MoreHorizontal, Play, Plus, Receipt, Timer } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import {
  Badge,
  Card,
  EmptyState,
  KeyValue,
  Progress,
  SectionHeader,
} from "@/components/ui/display";
import { EventTimeline } from "@/components/EventTimeline";
import { PhotoGrid } from "@/components/PhotoGrid";
import { useApp } from "@/store/app-store";
import { useEditors, useUI } from "@/store/ui-store";
import { useFocus } from "@/store/focus-store";
import { courseStats, hobbyStats, hobbySessionsThisWeek } from "@/lib/stats";
import { fmtDate, fmtHours, fmtMinutes, fmtMoney, fmtRelativeDays, monthKey, todayISO } from "@/lib/format";
import { HOBBY_STATUS } from "@/lib/labels";
import type { LifeEvent } from "@/lib/types";
import { uid } from "@/lib/utils";

export function HobbyDetailPage({ hobbyId }: { hobbyId: string }) {
  const { data, saveCourse, saveEvent, notify } = useApp();
  const { openModal } = useUI();
  const { newExpense, newNote, newMilestone } = useEditors();
  const { startFocus } = useFocus();

  const hobby = data.hobbies.find((h) => h.id === hobbyId);
  const stats = useMemo(() => (hobby ? hobbyStats(hobby.id, data) : null), [hobby, data]);
  const week = useMemo(() => (hobby ? hobbySessionsThisWeek(hobby.id, data) : null), [hobby, data]);
  const events = useMemo(() => data.events.filter((e) => e.hobbyId === hobbyId), [data.events, hobbyId]);
  const courses = useMemo(() => data.courses.filter((c) => c.hobbyId === hobbyId), [data.courses, hobbyId]);

  if (!hobby || !stats || !week) {
    return (
      <div className="animate-fade-up">
        <PageHeader title="兴趣" back="#/hobby" />
        <Card className="mt-4 px-2 py-2">
          <EmptyState title="这个兴趣已经不在了。" description="它可能已经被删除。" />
        </Card>
      </div>
    );
  }

  const thisMonth = stats.monthly.find((m) => m.month === monthKey(new Date()));
  const goalPct =
    hobby.weeklyGoalMinutes && hobby.weeklyGoalMinutes > 0
      ? Math.min(100, (week.minutes / hobby.weeklyGoalMinutes) * 100)
      : null;

  async function completeClass(courseId: string) {
    const course = courses.find((c) => c.id === courseId);
    if (!course) return;
    const cs = courseStats(course);
    if (cs.remaining <= 0) return;
    const now = new Date().toISOString();
    const event: LifeEvent = {
      id: uid("evt"),
      type: "session",
      date: todayISO(),
      durationMin: 60,
      title: course.name,
      hobbyId: hobby!.id,
      courseId: course.id,
      amount: Math.round(cs.perLesson),
      moneyType: "expense",
      expenseCategory: "course",
      timeCategory: "hobby",
      photoIds: [],
      mood: "good",
      createdAt: now,
      updatedAt: now,
    };
    await saveEvent(event, { silent: true });
    await saveCourse({ ...course, completedLessons: course.completedLessons + 1 });
    notify("已记录一节课", "success");
  }

  return (
    <div className="animate-fade-up">
      <PageHeader
        back="#/hobby"
        eyebrow={HOBBY_STATUS[hobby.status]}
        title={
          <span className="flex items-center gap-2.5">
            <span aria-hidden>{hobby.icon}</span>
            {hobby.name}
          </span>
        }
        subtitle={`Started ${fmtDate(hobby.startDate)}`}
        actions={
          <Button
            size="icon"
            variant="outline"
            aria-label="编辑"
            className="rounded-full"
            onClick={() => openModal("hobby", { initial: hobby })}
          >
            <MoreHorizontal className="size-4" />
          </Button>
        }
      />

      <div className="pt-4 lg:pt-0">
        <Card className="grid grid-cols-2 sm:grid-cols-4 sm:divide-x sm:divide-border/70">
          <Metric label="Total practice" value={fmtHours(stats.minutes)} sub={`${stats.sessions} sessions`} />
          <Metric
            label="Invested"
            value={fmtMoney(stats.invested)}
            sub={stats.minutes > 0 ? `${fmtMoney(stats.costPerHour, { decimals: 1 })} / hour` : undefined}
          />
          <Metric
            label="This month"
            value={thisMonth ? fmtHours(thisMonth.minutes) : "0h"}
            sub={thisMonth ? `${thisMonth.sessions} sessions` : undefined}
          />
          <Metric
            label="Last practice"
            value={stats.lastSessionDate ? fmtRelativeDays(stats.lastSessionDate) : "—"}
            sub={stats.lastSessionDate ? fmtDate(stats.lastSessionDate) : undefined}
          />
        </Card>
      </div>

      <div className="flex flex-wrap gap-2 pt-4">
        <Button
          size="pill"
          onClick={() => startFocus({ label: hobby.name, hobbyId: hobby.id, timeCategory: "hobby" }, 45)}
        >
          <Play className="size-3.5" />
          Start Session
        </Button>
        <Button
          size="pill"
          variant="outline"
          onClick={() => startFocus({ label: hobby.name, hobbyId: hobby.id, timeCategory: "hobby" }, 25)}
        >
          <Timer className="size-3.5" />
          25 min
        </Button>
        <Button size="pill" variant="outline" onClick={() => newExpense({ initial: { hobbyId: hobby.id } })}>
          <Receipt className="size-3.5" />
          记一笔花费
        </Button>
        <Button size="pill" variant="outline" onClick={() => newNote({ initial: { hobbyId: hobby.id } })}>
          <Plus className="size-3.5" />
          记录
        </Button>
        <Button size="pill" variant="outline" onClick={() => newMilestone({ initial: { hobbyId: hobby.id } })}>
          里程碑
        </Button>
      </div>

      {goalPct !== null && (
        <Card className="mt-4 p-5">
          <div className="flex items-baseline justify-between gap-3">
            <div className="label-caps">本周目标</div>
            <div className="numeral text-[12.5px] text-muted-foreground">
              {week.sessions}
              {hobby.weeklyGoalSessions ? ` / ${hobby.weeklyGoalSessions}` : ""} 次 · {fmtHours(week.minutes)} /{" "}
              {fmtHours(hobby.weeklyGoalMinutes ?? 0)}
            </div>
          </div>
          <div className="mt-3">
            <Progress value={goalPct} tone={hobby.accent} height={6} />
          </div>
        </Card>
      )}

      <section className="pt-8">
        <SectionHeader
          title="课程"
          hint={courses.length ? undefined : "私教、线上课都可以放进来"}
          action={
            <Button
              size="pill"
              variant="ghost"
              className="text-muted-foreground"
              onClick={() => openModal("course", { hobbyId: hobby.id })}
            >
              <Plus className="size-3.5" />
              添加课程
            </Button>
          }
        />
        {courses.length === 0 ? (
          <Card className="px-5 py-6 text-center text-[13px] text-muted-foreground">
            还没有课程记录。添加后会自动计算每节课成本与利用率。
          </Card>
        ) : (
          <div className="space-y-3">
            {courses.map((course) => {
              const cs = courseStats(course);
              return (
                <Card key={course.id} className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-[15px] font-medium text-foreground">{course.name}</div>
                      <div className="mt-1 text-[12.5px] text-muted-foreground">
                        总价 {fmtMoney(course.totalPrice)} · 每节 {fmtMoney(cs.perLesson)}
                      </div>
                    </div>
                    <Badge tone="outline">{Math.round(cs.utilisation * 100)}% 已用</Badge>
                  </div>
                  <div className="mt-3.5">
                    <Progress value={cs.utilisation * 100} height={5} tone={hobby.accent} />
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <SmallStat label="总课时" value={course.totalLessons} />
                    <SmallStat label="已完成" value={course.completedLessons} />
                    <SmallStat label="剩余" value={cs.remaining} />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      size="pill"
                      variant="subtle"
                      disabled={cs.remaining <= 0}
                      onClick={() => completeClass(course.id)}
                    >
                      Complete Class
                    </Button>
                    <Button
                      size="pill"
                      variant="ghost"
                      className="text-muted-foreground"
                      onClick={() => openModal("course", { initial: course, hobbyId: hobby.id })}
                    >
                      编辑
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {stats.photos.length > 0 && (
        <section className="pt-8">
          <SectionHeader title="Photos" hint={`${stats.photos.length} 张`} />
          <PhotoGrid ids={stats.photos.slice(-9)} columns={3} className="max-w-lg" />
        </section>
      )}

      {hobby.note && (
        <section className="pt-8">
          <SectionHeader title="Note" />
          <Card className="p-5">
            <p className="text-[14px] leading-relaxed text-foreground/85">{hobby.note}</p>
          </Card>
        </section>
      )}

      <section className="pt-8">
        <SectionHeader title="Cost Per Hour" hint="看看器材和课程有没有真的被用起来" />
        <Card className="divide-y divide-border/70 px-5">
          <KeyValue label="累计投入时间" value={fmtMinutes(stats.minutes)} />
          <KeyValue label="累计花费" value={fmtMoney(stats.invested)} />
          <KeyValue
            label="每小时成本"
            value={stats.minutes > 0 ? `${fmtMoney(stats.costPerHour, { decimals: 1 })} / hour` : "—"}
          />
          {stats.firstSessionDate && (
            <KeyValue label="第一次记录" value={fmtDate(stats.firstSessionDate)} />
          )}
        </Card>
      </section>

      <section className="pt-8">
        <SectionHeader title="Timeline" hint={`${events.length} 条记录`} />
        {events.length === 0 ? (
          <Card className="px-2 py-2">
            <EmptyState
              title="还没有任何记录。"
              description="第一次练习之后，这里会开始有一条属于它的线。"
            />
          </Card>
        ) : (
          <EventTimeline events={events} onSelect={(event) => openModal("event", { initial: event })} />
        )}
      </section>
    </div>
  );
}

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="border-b border-border/70 p-4 last:border-b-0 sm:border-b-0">
      <div className="label-caps">{label}</div>
      <div className="mt-2 numeral text-[24px] font-medium leading-none text-foreground">{value}</div>
      {sub && <div className="mt-1.5 text-[12px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

function SmallStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-secondary/50 py-2">
      <div className="numeral text-[17px] font-medium text-foreground">{value}</div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}
