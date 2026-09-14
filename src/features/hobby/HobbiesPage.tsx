import { useMemo, useState } from "react";
import { ChevronRight, Plus } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, IconBubble, Progress, Segmented } from "@/components/ui/display";
import { PhotoThumb } from "@/components/PhotoGrid";
import { Money } from "@/components/ui/money";
import { useApp } from "@/store/app-store";
import { useEditors, useUI } from "@/store/ui-store";
import { hobbyStats, hobbySessionsThisWeek } from "@/lib/stats";
import { fmtHours, fmtMoney, fmtRelativeDays } from "@/lib/format";
import { HOBBY_STATUS, JOURNEY_KIND, JOURNEY_STATUS } from "@/lib/labels";
import { navigate } from "@/lib/router";
import type { Hobby, Journey } from "@/lib/types";

export function HobbyList({ onCreate }: { onCreate: () => void }) {
  const { data } = useApp();
  const [showArchived, setShowArchived] = useState(false);

  const hobbies = useMemo(() => {
    const list = data.hobbies.filter((h) => (showArchived ? true : h.status !== "archived"));
    const weight: Record<string, number> = {
      deep: 0,
      active: 1,
      building: 2,
      trying: 3,
      paused: 4,
      archived: 5,
    };
    return [...list].sort((a, b) => (weight[a.status] ?? 9) - (weight[b.status] ?? 9));
  }, [data.hobbies, showArchived]);

  if (data.hobbies.length === 0) {
    return (
      <Card className="px-2 py-2">
        <EmptyState
          icon={<span className="text-[20px]">🥁</span>}
          title="还没有开始记录一个兴趣。"
          description="兴趣不是消费记录，而是一件可以持续很多年的事。"
          action={
            <Button size="pill" onClick={onCreate}>
              Create Your First Hobby
            </Button>
          }
        />
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[12.5px] text-muted-foreground">{hobbies.length} 个兴趣</span>
        <button
          type="button"
          onClick={() => setShowArchived((prev) => !prev)}
          className="text-[12.5px] text-muted-foreground transition-colors hover:text-foreground"
        >
          {showArchived ? "隐藏归档" : "显示归档"}
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {hobbies.map((hobby) => (
          <HobbyCard key={hobby.id} hobby={hobby} />
        ))}
      </div>
    </div>
  );
}

function HobbyCard({ hobby }: { hobby: Hobby }) {
  const { data } = useApp();
  const stats = useMemo(() => hobbyStats(hobby.id, data), [hobby.id, data]);
  const week = useMemo(() => hobbySessionsThisWeek(hobby.id, data), [hobby.id, data]);
  const cover = stats.photos.at(-1);
  const goalPct =
    hobby.weeklyGoalMinutes && hobby.weeklyGoalMinutes > 0
      ? Math.min(100, (week.minutes / hobby.weeklyGoalMinutes) * 100)
      : null;

  return (
    <button
      type="button"
      onClick={() => navigate(`#/hobby/${hobby.id}`)}
      className="surface group w-full p-4 text-left transition-colors hover:border-primary/25"
    >
      <div className="flex items-start gap-3">
        {cover ? (
          <PhotoThumb id={cover} className="size-11 shrink-0" rounded="rounded-lg" />
        ) : (
          <IconBubble accent={hobby.accent}>{hobby.icon}</IconBubble>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-[15.5px] font-medium text-foreground">{hobby.name}</span>
            <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10.5px] text-muted-foreground">
              {HOBBY_STATUS[hobby.status]}
            </span>
          </div>
          <div className="mt-1 text-[12px] text-muted-foreground">
            {stats.lastSessionDate ? `${fmtRelativeDays(stats.lastSessionDate)}练过` : "还没有开始记录"}
          </div>
        </div>
        <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground/40" />
      </div>

      <div className="mt-4 flex items-end gap-5">
        <div>
          <div className="numeral text-[22px] font-medium leading-none text-foreground">
            {fmtHours(stats.minutes)}
          </div>
          <div className="mt-1 text-[11.5px] text-muted-foreground">{stats.sessions} sessions</div>
        </div>
        <div>
          <Money
            map={stats.invested}
            compact
            className="text-[22px] font-medium leading-none text-foreground"
          />
          <div className="mt-1 text-[11.5px] text-muted-foreground">
            {stats.minutes > 0 ? (
              <>
                <Money map={stats.costPerHour} decimals={1} /> /h
              </>
            ) : (
              "投入"
            )}
          </div>
        </div>
      </div>

      {goalPct !== null && (
        <div className="mt-3.5 space-y-1.5">
          <Progress value={goalPct} tone={hobby.accent} height={4} />
          <div className="flex items-center justify-between text-[11.5px] text-muted-foreground">
            <span>本周 {week.sessions} 次</span>
            <span className="numeral">
              {fmtHours(week.minutes)} / {fmtHours(hobby.weeklyGoalMinutes ?? 0)}
            </span>
          </div>
        </div>
      )}
    </button>
  );
}

export function JourneyList({ onCreate }: { onCreate: () => void }) {
  const { data } = useApp();
  const journeys = useMemo(
    () => data.journeys.filter((j) => j.status !== "archived"),
    [data.journeys],
  );

  if (journeys.length === 0) {
    return (
      <Card className="px-2 py-2">
        <EmptyState
          icon={<span className="text-[20px]">🧭</span>}
          title="有些事情值得用几年去完成。"
          description="考试、语言、专业能力，都可以放进来。"
          action={
            <Button size="pill" onClick={onCreate}>
              Create a Journey
            </Button>
          }
        />
      </Card>
    );
  }

  return (
    <div className="grid gap-3">
      {journeys.map((journey) => (
        <JourneyCard key={journey.id} journey={journey} />
      ))}
    </div>
  );
}

function JourneyCard({ journey }: { journey: Journey }) {
  const { data } = useApp();
  const stages = useMemo(
    () => data.stages.filter((s) => s.journeyId === journey.id).sort((a, b) => a.order - b.order),
    [data.stages, journey.id],
  );
  const completed = stages.filter((s) => s.status === "completed").length;
  const next = stages.find((s) => s.status !== "completed");

  const minutes = useMemo(
    () =>
      data.events
        .filter((e) => e.journeyId === journey.id && e.type === "session")
        .reduce((acc, e) => acc + (e.durationMin ?? 0), 0),
    [data.events, journey.id],
  );
  const invested = useMemo(
    () =>
      data.events
        .filter((e) => e.journeyId === journey.id && e.moneyType === "expense")
        .reduce((acc, e) => acc + (e.amount ?? 0), 0),
    [data.events, journey.id],
  );

  return (
    <button
      type="button"
      onClick={() => navigate(`#/journey/${journey.id}`)}
      className="surface w-full p-5 text-left transition-colors hover:border-primary/25"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-[16px] font-medium text-foreground">{journey.name}</span>
            <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[10.5px] text-muted-foreground">
              {JOURNEY_KIND[journey.kind]}
            </span>
          </div>
          <div className="mt-1 text-[12.5px] text-muted-foreground">
            {JOURNEY_STATUS[journey.status]}
            {journey.description ? ` · ${journey.description}` : ""}
          </div>
        </div>
        <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground/40" />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <div>
          <div className="numeral text-[19px] font-medium leading-none text-foreground">
            {fmtHours(minutes)}
          </div>
          <div className="mt-1 text-[11.5px] text-muted-foreground">时间投入</div>
        </div>
        <div>
          <div className="numeral text-[19px] font-medium leading-none text-foreground">
            {fmtMoney(invested, { compact: true })}
          </div>
          <div className="mt-1 text-[11.5px] text-muted-foreground">资金投入</div>
        </div>
        <div>
          <div className="numeral text-[19px] font-medium leading-none text-foreground">
            {completed}/{stages.length}
          </div>
          <div className="mt-1 text-[11.5px] text-muted-foreground">阶段</div>
        </div>
      </div>

      {stages.length > 0 && (
        <div className="mt-4 space-y-2">
          <Progress
            value={stages.length ? (completed / stages.length) * 100 : 0}
            height={4}
            tone={journey.accent}
          />
          {next && (
            <div className="text-[12px] text-muted-foreground">
              下一步 · <span className="text-foreground/80">{next.goal}</span>
            </div>
          )}
        </div>
      )}
    </button>
  );
}

export function JourneyTabPage({ segment }: { segment: "journeys" | "hobbies" }) {
  const { openModal } = useUI();
  const { newHobby, newJourney } = useEditors();

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Journey"
        subtitle="长期主义账户 · 成长与兴趣"
        actions={
          <Button
            size="icon"
            variant="outline"
            aria-label="新建"
            onClick={() => (segment === "journeys" ? newJourney() : newHobby())}
            className="rounded-full"
          >
            <Plus className="size-4" />
          </Button>
        }
      />
      <div className="pb-5 pt-4 lg:pt-0">
        <Segmented
          value={segment}
          onChange={(value) => navigate(value === "journeys" ? "#/journey" : "#/hobby")}
          options={[
            { value: "journeys", label: "Journeys" },
            { value: "hobbies", label: "Hobbies" },
          ]}
          className="max-w-xs"
        />
      </div>
      {segment === "journeys" ? (
        <JourneyList onCreate={() => newJourney()} />
      ) : (
        <HobbyList onCreate={() => newHobby()} />
      )}
      <div className="pt-6">
        <button
          type="button"
          onClick={() => openModal("focusSetup")}
          className="w-full rounded-lg border border-dashed border-border px-4 py-3.5 text-[13.5px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
        >
          用 Focus Timer 记录一次投入 →
        </button>
      </div>
    </div>
  );
}
