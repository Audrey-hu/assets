import { useEffect, useMemo, useState } from "react";
import { Dialog } from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Pause, Play, Square, X } from "lucide-react";
import { SheetBody, SheetContent, SheetFooter, SheetHeader } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Chip, Field, Input } from "@/components/ui/form";
import { Segmented } from "@/components/ui/display";
import { PhotoGrid, PhotoPickerInput } from "@/components/PhotoGrid";
import { useApp } from "@/store/app-store";
import { useFocus, FOCUS_PRESETS } from "@/store/focus-store";
import { useUI } from "@/store/ui-store";
import { MOOD, MOOD_ORDER, TIME_CATEGORY, TIME_CATEGORY_ORDER } from "@/lib/labels";
import { fmtMinutes, nowHHmm, todayISO } from "@/lib/format";
import { cn, uid } from "@/lib/utils";
import type { LifeEvent, Mood, TimeCategory } from "@/lib/types";

/* -------------------------------------------------------------------- *
 * 1. Setup — pick what you are working on, then a preset.
 * -------------------------------------------------------------------- */

type SetupTab = "hobby" | "journey" | "sideproject" | "life";

export function FocusSetupSheet() {
  const { modal, closeModal } = useUI();
  const open = modal === "focusSetup";
  const { data } = useApp();
  const { startFocus } = useFocus();

  const [tab, setTab] = useState<SetupTab>("hobby");
  const [selected, setSelected] = useState<string>("");
  const [customTitle, setCustomTitle] = useState("");
  const [lifeCategory, setLifeCategory] = useState<TimeCategory>("health");
  const [preset, setPreset] = useState<number | "free" | "custom">(45);
  const [customMinutes, setCustomMinutes] = useState<number | undefined>(30);

  const hobbies = useMemo(() => data.hobbies.filter((h) => h.status !== "archived"), [data.hobbies]);
  const journeys = useMemo(() => data.journeys.filter((j) => j.status !== "archived"), [data.journeys]);

  useEffect(() => {
    if (!open) return;
    setTab("hobby");
    setSelected(hobbies[0]?.id ?? "");
    setCustomTitle("");
    setLifeCategory("health");
    setPreset(45);
  }, [open, hobbies]);

  const planned = preset === "free" ? null : preset === "custom" ? (customMinutes ?? 30) : preset;

  function resolveTarget() {
    if (tab === "hobby") {
      const hobby = hobbies.find((h) => h.id === selected);
      if (!hobby) return null;
      return {
        label: hobby.name,
        title: customTitle.trim() || undefined,
        hobbyId: hobby.id,
        timeCategory: "hobby" as TimeCategory,
      };
    }
    if (tab === "journey" || tab === "sideproject") {
      const pool = tab === "journey" ? journeys : journeys;
      const journey = pool.find((j) => j.id === selected);
      if (!journey) return null;
      return {
        label: journey.name,
        title: customTitle.trim() || undefined,
        journeyId: journey.id,
        timeCategory: (tab === "sideproject" ? "sideproject" : "growth") as TimeCategory,
      };
    }
    return {
      label: TIME_CATEGORY[lifeCategory].label,
      title: customTitle.trim() || undefined,
      timeCategory: lifeCategory,
    };
  }

  async function handleStart() {
    const target = resolveTarget();
    if (!target) return;
    startFocus(target, planned);
    closeModal();
  }

  const list =
    tab === "hobby" ? hobbies.map((h) => ({ id: h.id, label: h.name, emoji: h.icon })) : journeys.map((j) => ({ id: j.id, label: j.name, emoji: "" }));

  return (
    <Dialog open={open} onOpenChange={(next) => !next && closeModal()}>
      <SheetContent>
        <SheetHeader title="Start a session" description="这段时间会同时进入 Today、After Work 和对应的时间线。" />
        <SheetBody className="space-y-4">
          <Segmented
            value={tab}
            onChange={(value) => {
              setTab(value);
              const pool = value === "hobby" ? hobbies : journeys;
              setSelected(value === "life" ? "" : (pool[0]?.id ?? ""));
            }}
            options={[
              { value: "hobby", label: "兴趣" },
              { value: "journey", label: "成长" },
              { value: "sideproject", label: "副业" },
              { value: "life", label: "生活" },
            ]}
          />

          {tab === "life" ? (
            <Field label="时间属于">
              <div className="flex flex-wrap gap-1.5">
                {(["health", "social", "entertainment", "rest", "other"] as TimeCategory[]).map((key) => (
                  <Chip key={key} active={lifeCategory === key} onClick={() => setLifeCategory(key)}>
                    {TIME_CATEGORY[key].label}
                  </Chip>
                ))}
              </div>
            </Field>
          ) : (
            <Field label="选择项目">
              <div className="space-y-1">
                {list.length === 0 && (
                  <p className="text-[13px] text-muted-foreground">
                    {tab === "hobby" ? "还没有兴趣项目，先创建一个。" : "还没有 Journey，先创建一个。"}
                  </p>
                )}
                {list.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelected(item.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors",
                      selected === item.id
                        ? "border-primary/35 bg-accent/60"
                        : "border-border/70 hover:bg-secondary/50",
                    )}
                  >
                    {item.emoji && <span aria-hidden className="text-[17px]">{item.emoji}</span>}
                    <span className="flex-1 text-[14px] text-foreground">{item.label}</span>
                    {selected === item.id && <Check className="size-4 text-primary" />}
                  </button>
                ))}
              </div>
            </Field>
          )}

          <Field label="这次做什么" hint="可选">
            <Input
              value={customTitle}
              placeholder="例如：Paradiddle 练习"
              onChange={(event) => setCustomTitle(event.target.value)}
            />
          </Field>

          <Field label="时长">
            <div className="flex flex-wrap gap-1.5">
              {FOCUS_PRESETS.map((minutes) => (
                <Chip key={minutes} active={preset === minutes} onClick={() => setPreset(minutes)}>
                  {minutes} min
                </Chip>
              ))}
              <Chip active={preset === "custom"} onClick={() => setPreset("custom")}>
                自定义
              </Chip>
              <Chip active={preset === "free"} onClick={() => setPreset("free")}>
                Free Timer
              </Chip>
            </div>
            {preset === "custom" && (
              <Input
                className="mt-2 numeral"
                inputMode="numeric"
                placeholder="分钟"
                value={customMinutes ?? ""}
                onChange={(event) => {
                  const raw = event.target.value.replace(/[^\d]/g, "");
                  setCustomMinutes(raw === "" ? undefined : Number(raw));
                }}
              />
            )}
          </Field>
        </SheetBody>
        <SheetFooter className="flex items-center justify-between gap-2">
          <span className="text-[12.5px] text-muted-foreground">
            {planned === null ? "自由计时" : `计划 ${fmtMinutes(planned)}`}
          </span>
          <Button
            size="lg"
            onClick={handleStart}
            disabled={tab !== "life" && !selected}
          >
            <Play className="size-4" />
            开始
          </Button>
        </SheetFooter>
      </SheetContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------- *
 * 2. Timer — full screen, quiet, unmissable.
 * -------------------------------------------------------------------- */

export function FocusTimerOverlay() {
  const focus = useFocus();
  const show = Boolean(focus.target) && focus.sheetOpen && !focus.pendingSummary;
  if (!show || !focus.target) return null;

  const planned = focus.plannedMinutes;
  const total = planned ? planned * 60 : Math.max(focus.elapsedSec, 1);
  const progress = Math.min(1, focus.elapsedSec / total);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.24 }}
        className="fixed inset-0 z-[70] flex flex-col bg-background safe-top"
      >
        <div className="mx-auto flex w-full max-w-xl flex-1 flex-col px-5 pb-7 pt-4 sm:justify-center">
          <div className="flex items-center justify-between">
            <button
              type="button"
              aria-label="收起"
              onClick={focus.closeSheet}
              className="-ml-2 grid size-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-secondary"
            >
              <X className="size-5" />
            </button>
            <span className="label-caps">{planned ? `${planned} min session` : "free timer"}</span>
            <span className="size-9" />
          </div>

          <div className="flex flex-1 flex-col items-center justify-center gap-8 py-8">
            <TimerDial progress={progress} active={focus.running} />
            <div className="text-center">
              <div className="text-[17px] font-medium tracking-[-0.01em] text-foreground">
                {focus.target.label}
              </div>
              <div className="mt-1 text-[13px] text-muted-foreground">
                {focus.target.title ??
                  (focus.running ? "进行中" : focus.elapsedSec > 0 ? "已暂停" : "准备开始")}
              </div>
              {focus.pauseSec >= 60 && (
                <div className="mt-1 text-[12px] text-muted-foreground numeral">
                  暂停 {fmtMinutes(focus.pauseSec / 60)}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <Button
                variant="outline"
                size="lg"
                className="h-14 flex-1"
                onClick={() => {
                  focus.cancel();
                  focus.closeSheet();
                }}
              >
                放弃
              </Button>
              <Button
                variant={focus.running ? "secondary" : "primary"}
                size="lg"
                className="h-14 flex-[1.4]"
                onClick={() => (focus.running ? focus.pause() : focus.resume())}
              >
                {focus.running ? (
                  <>
                    <Pause className="size-5" /> 暂停
                  </>
                ) : (
                  <>
                    <Play className="size-5" /> 继续
                  </>
                )}
              </Button>
              <Button size="lg" className="h-14 flex-1" onClick={focus.finish}>
                <Square className="size-4" /> 结束
              </Button>
            </div>
            <p className="text-center text-[12px] text-muted-foreground">
              提前结束也没关系，只记录真实投入的时间。
            </p>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function TimerDial({ progress, active }: { progress: number; active: boolean }) {
  const focus = useFocus();
  const radius = 108;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(1, Math.max(0, progress)));
  const planned = focus.plannedMinutes;
  const seconds = planned ? Math.max(0, focus.remainingSec ?? 0) : focus.elapsedSec;
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <div className="relative">
      <svg viewBox="0 0 240 240" className="size-[248px] max-w-[76vw] -rotate-90 sm:size-[280px]">
        <circle cx="120" cy="120" r={radius} fill="none" stroke="hsl(var(--border))" strokeWidth="4" />
        <motion.circle
          cx="120"
          cy="120"
          r={radius}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.4, ease: "linear" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div
          className={cn(
            "numeral text-[54px] font-light leading-none tracking-[-0.03em] text-foreground sm:text-[64px]",
            active && "text-foreground",
          )}
        >
          {mm}:{ss}
        </div>
        <div className="mt-2 text-[12px] uppercase tracking-[0.16em] text-muted-foreground">
          {active ? "running" : "paused"}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------- *
 * 3. Summary — what actually happened.
 * -------------------------------------------------------------------- */

export function SessionSummarySheet() {
  const focus = useFocus();
  const summary = focus.pendingSummary;
  const { addPhotos, saveEvent } = useApp();

  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState(0);
  const [mood, setMood] = useState<Mood | undefined>();
  const [note, setNote] = useState("");
  const [photoIds, setPhotoIds] = useState<string[]>([]);
  const [timeCategory, setTimeCategory] = useState<TimeCategory>("hobby");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!summary) return;
    setTitle(summary.target.title ?? "");
    setDuration(Math.max(1, summary.durationMin));
    setMood(undefined);
    setNote("");
    setPhotoIds([]);
    setTimeCategory(summary.target.timeCategory ?? "hobby");
  }, [summary]);

  const open = Boolean(summary);

  async function handleSave() {
    if (!summary) return;
    setSaving(true);
    const now = new Date().toISOString();
    const event: LifeEvent = {
      id: uid("evt"),
      type: "session",
      date: todayISO(summary.startedAt),
      startTime: nowHHmm(summary.startedAt),
      endTime: nowHHmm(summary.endedAt),
      durationMin: duration,
      title: title.trim() || summary.target.label,
      note: note.trim() || undefined,
      mood,
      photoIds,
      hobbyId: summary.target.hobbyId,
      journeyId: summary.target.journeyId,
      stageId: summary.target.stageId,
      courseId: summary.target.courseId,
      timeCategory,
      createdAt: now,
      updatedAt: now,
    };
    await saveEvent(event);
    setSaving(false);
    focus.reset();
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && focus.reset()}>
      <SheetContent>
        <SheetHeader
          title="Session Complete"
          description={
            summary
              ? `${nowHHmm(summary.startedAt)} → ${nowHHmm(summary.endedAt)}${
                  summary.pauseMin > 0 ? ` · 暂停 ${summary.pauseMin} min` : ""
                }`
              : undefined
          }
        />
        <SheetBody className="space-y-4">
          <div className="surface flex items-end justify-between px-4 py-3.5">
            <div>
              <div className="label-caps">实际投入</div>
              <div className="mt-1.5 numeral text-[32px] font-medium leading-none text-foreground">
                {fmtMinutes(duration)}
              </div>
            </div>
            <div className="text-right">
              <div className="label-caps">项目</div>
              <div className="mt-1.5 text-[14px] text-foreground">{summary?.target.label}</div>
            </div>
          </div>

          <Field label="时长（分钟）">
            <Input
              inputMode="numeric"
              className="numeral"
              value={duration}
              onChange={(event) => {
                const raw = event.target.value.replace(/[^\d]/g, "");
                setDuration(raw === "" ? 0 : Number(raw));
              }}
            />
          </Field>

          <Field label="What did you do?">
            <Input
              value={title}
              placeholder="例如：练习 Paradiddle + 完整打一遍歌曲"
              onChange={(event) => setTitle(event.target.value)}
            />
          </Field>

          <Field label="状态">
            <div className="flex flex-wrap gap-1.5">
              {MOOD_ORDER.map((key) => (
                <Chip key={key} active={mood === key} onClick={() => setMood(mood === key ? undefined : key)}>
                  <span aria-hidden>{MOOD[key].emoji}</span>
                  {MOOD[key].label}
                </Chip>
              ))}
            </div>
          </Field>

          <Field label="时间属于">
            <div className="flex flex-wrap gap-1.5">
              {TIME_CATEGORY_ORDER.filter((c) => c !== "other").map((key) => (
                <Chip key={key} active={timeCategory === key} onClick={() => setTimeCategory(key)}>
                  {TIME_CATEGORY[key].label}
                </Chip>
              ))}
            </div>
          </Field>

          <Field label="照片" hint={`最多 6 张 · ${photoIds.length}/6`}>
            <PhotoGrid
              ids={photoIds}
              onRemove={(id) => setPhotoIds((prev) => prev.filter((photoId) => photoId !== id))}
              className="max-w-[260px]"
            />
            {photoIds.length < 6 && (
              <PhotoPickerInput
                remaining={6 - photoIds.length}
                onFiles={async (files) => {
                  const ids = await addPhotos(files);
                  setPhotoIds((prev) => [...prev, ...ids].slice(0, 6));
                }}
                className="mt-2 inline-flex h-9 items-center gap-2 rounded-md border border-dashed border-border px-3 text-[13px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
              >
                添加照片
              </PhotoPickerInput>
            )}
          </Field>

          <Field label="Notes" hint="一句话">
            <Input
              value={note}
              placeholder="例如：右脚终于顺了一点。"
              onChange={(event) => setNote(event.target.value)}
            />
          </Field>
        </SheetBody>
        <SheetFooter className="flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="lg"
            onClick={() => {
              focus.reset();
            }}
          >
            不保存
          </Button>
          <Button size="lg" onClick={handleSave} disabled={saving}>
            Save Session
          </Button>
        </SheetFooter>
      </SheetContent>
    </Dialog>
  );
}
