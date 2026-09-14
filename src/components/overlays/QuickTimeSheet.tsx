import { useEffect, useMemo, useState } from "react";
import { Dialog } from "@radix-ui/react-dialog";
import { Minus, Plus } from "lucide-react";
import { SheetBody, SheetContent, SheetFooter, SheetHeader } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Chip, Field, Input } from "@/components/ui/form";
import { CoursePicker } from "@/components/editors/fields";
import { useApp } from "@/store/app-store";
import { useUI } from "@/store/ui-store";
import { MOOD, MOOD_ORDER, TIME_CATEGORY } from "@/lib/labels";
import { fmtMinutes, todayISO } from "@/lib/format";
import { cn, uid } from "@/lib/utils";
import type { LifeEvent, Mood, TimeCategory } from "@/lib/types";

/** 常用时长，按"一次练习大概多久"排 */
const PRESETS = [15, 30, 45, 60, 90, 120, 180];

const LIFE_CATEGORIES: TimeCategory[] = ["health", "social", "entertainment", "rest", "other"];

/**
 * 补记时长：不打计时器，直接把"我刚练了多久"记下来。
 *
 * 和焦点计时产生的记录走同一条数据通路（LifeEvent + durationMin），
 * 所以一样会进入 Today、After Work 时间构成、日历和对应的时间线。
 */
export function QuickTimeSheet() {
  const { modal, payload, closeModal } = useUI();
  const open = modal === "quickTime";
  const { data, saveEvent } = useApp();

  const presetDuration = payload.durationMin as number | undefined;
  const presetHobby = payload.hobbyId as string | undefined;
  const presetJourney = payload.journeyId as string | undefined;

  const [date, setDate] = useState(todayISO());
  const [minutes, setMinutes] = useState<number>(presetDuration ?? 45);
  const [custom, setCustom] = useState(false);
  const [title, setTitle] = useState("");
  const [mood, setMood] = useState<Mood | undefined>();
  const [hobbyId, setHobbyId] = useState<string | undefined>();
  const [journeyId, setJourneyId] = useState<string | undefined>();
  const [courseId, setCourseId] = useState<string | undefined>();
  const [lifeCategory, setLifeCategory] = useState<TimeCategory>("health");
  const [error, setError] = useState("");

  const hobbies = useMemo(
    () => data.hobbies.filter((h) => h.status !== "archived"),
    [data.hobbies],
  );
  const journeys = useMemo(
    () => data.journeys.filter((j) => j.status !== "archived"),
    [data.journeys],
  );

  useEffect(() => {
    if (!open) return;
    setDate(todayISO());
    setMinutes(presetDuration ?? 45);
    setCustom(Boolean(presetDuration && !PRESETS.includes(presetDuration)));
    setTitle("");
    setMood(undefined);
    setHobbyId(presetHobby);
    setJourneyId(presetJourney);
    setCourseId(undefined);
    setLifeCategory("health");
    setError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const targetName =
    hobbies.find((h) => h.id === hobbyId)?.name ??
    journeys.find((j) => j.id === journeyId)?.name ??
    TIME_CATEGORY[lifeCategory].label;

  const timeCategory: TimeCategory = hobbyId
    ? "hobby"
    : journeyId
      ? journeys.find((j) => j.id === journeyId)?.kind === "networking"
        ? "social"
        : "growth"
      : lifeCategory;

  /* 选了兴趣或 Journey 之后，列出它下面的课程 */
  const relatedCourses = useMemo(
    () =>
      data.courses.filter(
        (course) =>
          (hobbyId && course.hobbyId === hobbyId) ||
          (journeyId && course.journeyId === journeyId),
      ),
    [data.courses, hobbyId, journeyId],
  );

  async function handleSave() {
    if (!minutes || minutes <= 0) {
      setError("填一个大于 0 的时长。");
      return;
    }
    if (minutes > 24 * 60) {
      setError("一次最多记 24 小时。");
      return;
    }
    const now = new Date().toISOString();
    const event: LifeEvent = {
      id: uid("evt"),
      type: "session",
      date,
      durationMin: minutes,
      title: title.trim() || targetName,
      mood,
      photoIds: [],
      hobbyId,
      journeyId,
      courseId,
      meta: courseId ? { lesson: true } : undefined,
      timeCategory,
      createdAt: now,
      updatedAt: now,
    };
    await saveEvent(event);
    closeModal();
  }

  function step(delta: number) {
    setCustom(true);
    setMinutes((prev) => Math.max(5, Math.min(24 * 60, (prev || 0) + delta)));
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && closeModal()}>
      <SheetContent>
        <SheetHeader
          title="补记时长"
          description="没打计时器也能记。写多少就算多少，一样进统计。"
        />
        <SheetBody className="space-y-5">
          {/* 时长是主角，放最上面 */}
          <div>
            <div className="flex items-end justify-between pb-2.5">
              <span className="text-[13px] font-medium text-foreground/80">这次投入了多久</span>
              <span className="numeral text-[15px] font-medium text-foreground">
                {fmtMinutes(minutes)}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((preset) => (
                <Chip
                  key={preset}
                  active={!custom && minutes === preset}
                  onClick={() => {
                    setCustom(false);
                    setMinutes(preset);
                  }}
                  className="px-3.5 py-2"
                >
                  {preset >= 60 ? `${preset / 60}h` : `${preset}m`}
                </Chip>
              ))}
              <Chip active={custom} onClick={() => setCustom(true)} className="px-3.5 py-2">
                自定义
              </Chip>
            </div>

            {custom && (
              <div className="mt-3 flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="减少 5 分钟"
                  className="size-11 shrink-0"
                  onClick={() => step(-5)}
                >
                  <Minus className="size-4" />
                </Button>
                <div className="relative flex-1">
                  <Input
                    inputMode="numeric"
                    className="numeral h-11 text-center text-[17px]"
                    value={minutes || ""}
                    onChange={(event) => {
                      const raw = event.target.value.replace(/[^\d]/g, "");
                      setMinutes(raw === "" ? 0 : Number(raw));
                    }}
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-muted-foreground">
                    分钟
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="增加 5 分钟"
                  className="size-11 shrink-0"
                  onClick={() => step(5)}
                >
                  <Plus className="size-4" />
                </Button>
              </div>
            )}
            {error && <p className="mt-2 text-[12px] text-destructive">{error}</p>}
          </div>

          {/* 记给谁 */}
          <Field label="记给哪个项目">
            <div className="flex flex-wrap gap-1.5">
              {hobbies.map((hobby) => (
                <Chip
                  key={hobby.id}
                  active={hobbyId === hobby.id}
                  onClick={() => {
                    setHobbyId(hobbyId === hobby.id ? undefined : hobby.id);
                    setJourneyId(undefined);
                    setCourseId(undefined);
                  }}
                >
                  <span aria-hidden>{hobby.icon}</span>
                  {hobby.name}
                </Chip>
              ))}
              {journeys.map((journey) => (
                <Chip
                  key={journey.id}
                  active={journeyId === journey.id}
                  onClick={() => {
                    setJourneyId(journeyId === journey.id ? undefined : journey.id);
                    setHobbyId(undefined);
                    setCourseId(undefined);
                  }}
                >
                  {journey.name}
                </Chip>
              ))}
            </div>
          </Field>

          <CoursePicker
            courses={relatedCourses}
            value={courseId}
            onChange={setCourseId}
            onPick={(course) => {
              /* 按这门课的写法自动填好，省得每次重打 */
              if (!title.trim()) setTitle(course.name);
              setMinutes(course.lessonMinutes ?? 60);
              setCustom(true);
            }}
          />

          {courseId && (
            <p className="text-[12px] leading-relaxed text-muted-foreground">
              {(() => {
                const course = relatedCourses.find((c) => c.id === courseId);
                if (!course) return null;
                const remaining = Math.max(0, course.totalLessons - course.completedLessons);
                return `保存后《${course.name}》的剩余课时 ${remaining} → ${Math.max(0, remaining - 1)} 节。`;
              })()}
            </p>
          )}

          {!hobbyId && !journeyId && (
            <Field label="属于哪一类时间">
              <div className="flex flex-wrap gap-1.5">
                {LIFE_CATEGORIES.map((key) => (
                  <Chip
                    key={key}
                    active={lifeCategory === key}
                    onClick={() => setLifeCategory(key)}
                  >
                    {TIME_CATEGORY[key].label}
                  </Chip>
                ))}
              </div>
            </Field>
          )}

          <Field label="做了什么" hint="可选">
            <Input
              value={title}
              placeholder={`例如：${targetName}练习`}
              onChange={(event) => setTitle(event.target.value)}
            />
          </Field>

          <Field label="日期">
            <div className="flex flex-wrap items-center gap-2">
              <Chip active={date === todayISO()} onClick={() => setDate(todayISO())}>
                今天
              </Chip>
              <Chip
                active={date === yesterday()}
                onClick={() => setDate(yesterday())}
              >
                昨天
              </Chip>
              <Input
                type="date"
                className="h-9 w-auto flex-1 numeral"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </div>
          </Field>

          <Field label="感觉" hint="可选">
            <div className="flex flex-wrap gap-1.5">
              {MOOD_ORDER.map((key) => (
                <Chip key={key} active={mood === key} onClick={() => setMood(mood === key ? undefined : key)}>
                  <span aria-hidden>{MOOD[key].emoji}</span>
                  {MOOD[key].label}
                </Chip>
              ))}
            </div>
          </Field>

          <div
            className={cn(
              "rounded-lg border border-border/70 bg-secondary/40 px-3.5 py-3",
              "text-[12.5px] leading-relaxed text-muted-foreground",
            )}
          >
            保存后会记入 <span className="text-foreground/80">{targetName}</span>，并同时出现在
            Today、After Work 时间构成和日历里。
          </div>
        </SheetBody>
        <SheetFooter className="flex items-center justify-between gap-2">
          <span className="text-[12.5px] text-muted-foreground">
            {fmtMinutes(minutes)} · {targetName}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="lg" onClick={closeModal}>
              取消
            </Button>
            <Button size="lg" onClick={handleSave}>
              记下来
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Dialog>
  );
}

function yesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return todayISO(d);
}
