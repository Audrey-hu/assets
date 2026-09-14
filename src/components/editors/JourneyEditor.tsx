import { useEffect, useState } from "react";
import { Dialog } from "@radix-ui/react-dialog";
import { SheetBody, SheetContent, SheetFooter, SheetHeader } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { AccentPicker, DecimalInput, CurrencyPicker, MoneyInput } from "./fields";
import { JOURNEY_KIND, JOURNEY_STATUS, STAGE_PHASE, STAGE_PHASE_ORDER } from "@/lib/labels";
import { fmtDate, fmtMoney, toDate, todayISO } from "@/lib/format";
import type { CurrencyCode } from "@/lib/format";
import { uid } from "@/lib/utils";
import { useApp } from "@/store/app-store";
import { useUI } from "@/store/ui-store";
import type { AccentKey, Journey, JourneyKind, JourneyStatus, Stage, StagePhase } from "@/lib/types";

const KIND_ORDER: JourneyKind[] = [
  "exam",
  "study",
  "language",
  "professional",
  "networking",
  "content",
  "career",
  "habit",
  "other",
];

export function JourneyEditor() {
  const { modal, payload, closeModal, askConfirm } = useUI();
  const open = modal === "journey";
  const initial = (payload.initial ?? {}) as Partial<Journey>;
  const { saveJourney, deleteJourney } = useApp();

  const [name, setName] = useState("");
  const [kind, setKind] = useState<JourneyKind>("exam");
  const [accent, setAccent] = useState<AccentKey>("sage");
  const [startDate, setStartDate] = useState(todayISO());
  const [targetDate, setTargetDate] = useState<string>("");
  const [status, setStatus] = useState<JourneyStatus>("active");
  const [description, setDescription] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setName(initial.name ?? "");
    setKind(initial.kind ?? "exam");
    setAccent(initial.accent ?? "sage");
    setStartDate(initial.startDate ?? todayISO());
    setTargetDate(initial.targetDate ?? "");
    setStatus(initial.status ?? "active");
    setDescription(initial.description ?? "");
    setNote(initial.note ?? "");
    setError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function handleSave() {
    if (!name.trim()) {
      setError("给这段旅程起个名字。");
      return;
    }
    if (targetDate && toDate(targetDate) < toDate(startDate)) {
      setError("目标日期不能早于开始日期。");
      return;
    }
    const now = new Date().toISOString();
    await saveJourney({
      id: initial.id ?? uid("jrn"),
      name: name.trim(),
      kind,
      accent,
      startDate,
      targetDate: targetDate || undefined,
      status,
      description: description.trim() || undefined,
      note: note.trim() || undefined,
      createdAt: initial.createdAt ?? now,
      updatedAt: now,
    });
    closeModal();
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && closeModal()}>
      <SheetContent>
        <SheetHeader
          title={initial.id ? "编辑 Journey" : "新增 Journey"}
          description="有些事情值得用几年去完成。"
        />
        <SheetBody className="space-y-4">
          <Field label="名称" error={error}>
            <Input
              autoFocus
              value={name}
              placeholder="例如：SQE1"
              onChange={(event) => setName(event.target.value)}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="类型">
              <Select value={kind} onChange={(event) => setKind(event.target.value as JourneyKind)}>
                {KIND_ORDER.map((key) => (
                  <option key={key} value={key}>
                    {JOURNEY_KIND[key]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="状态">
              <Select
                value={status}
                onChange={(event) => setStatus(event.target.value as JourneyStatus)}
              >
                {(Object.keys(JOURNEY_STATUS) as JourneyStatus[]).map((key) => (
                  <option key={key} value={key}>
                    {JOURNEY_STATUS[key]}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="开始日期">
              <Input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </Field>
            <Field label="目标日期" hint="可选">
              <Input
                type="date"
                value={targetDate}
                onChange={(event) => setTargetDate(event.target.value)}
              />
            </Field>
          </div>
          <AccentPicker value={accent} onChange={setAccent} />
          <Field label="描述">
            <Textarea
              value={description}
              placeholder="这段旅程想通向哪里？"
              onChange={(event) => setDescription(event.target.value)}
            />
          </Field>
          <Field label="备注">
            <Input value={note} onChange={(event) => setNote(event.target.value)} />
          </Field>
        </SheetBody>
        <SheetFooter className="flex items-center gap-2">
          {initial.id && (
            <Button
              variant="destructive"
              size="lg"
              onClick={() =>
                askConfirm({
                  title: `删除「${initial.name}」？`,
                  description: "阶段、时间记录、支出与照片都会一起删除。",
                  confirmLabel: "删除",
                  destructive: true,
                  onConfirm: async () => {
                    await deleteJourney(initial.id!);
                    closeModal();
                  },
                })
              }
            >
              删除
            </Button>
          )}
          <Button variant="ghost" size="lg" className="ml-auto" onClick={closeModal}>
            取消
          </Button>
          <Button size="lg" onClick={handleSave}>
            保存
          </Button>
        </SheetFooter>
      </SheetContent>
    </Dialog>
  );
}

export function StageEditor() {
  const { modal, payload, closeModal, askConfirm } = useUI();
  const open = modal === "stage";
  const initial = (payload.initial ?? {}) as Partial<Stage>;
  const journeyId = (payload.journeyId as string | undefined) ?? initial.journeyId;
  const { data, saveStage, deleteStage } = useApp();

  const [phase, setPhase] = useState<StagePhase>("foundation");
  const [goal, setGoal] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState<Stage["status"]>("planned");
  const [progress, setProgress] = useState(0);
  const [targetHours, setTargetHours] = useState<number | undefined>();
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setPhase(initial.phase ?? "foundation");
    setGoal(initial.goal ?? "");
    setStartDate(initial.startDate ?? "");
    setEndDate(initial.endDate ?? "");
    setStatus(initial.status ?? "planned");
    setProgress(initial.progress ?? 0);
    setTargetHours(initial.targetMinutes ? Math.round(initial.targetMinutes / 60) : undefined);
    setNote(initial.note ?? "");
    setError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function handleSave() {
    if (!journeyId) {
      setError("缺少所属 Journey。");
      return;
    }
    if (!goal.trim()) {
      setError("写一句这个阶段的目标。");
      return;
    }
    const now = new Date().toISOString();
    const order = initial.order ?? (data.stages.filter((s) => s.journeyId === journeyId).length + 1);
    await saveStage({
      id: initial.id ?? uid("stg"),
      journeyId,
      phase,
      goal: goal.trim(),
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      status,
      progress: status === "completed" ? 100 : Math.max(0, Math.min(100, progress)),
      targetMinutes: targetHours ? targetHours * 60 : undefined,
      note: note.trim() || undefined,
      order,
      completedAt: status === "completed" ? (initial.completedAt ?? now) : undefined,
      createdAt: initial.createdAt ?? now,
      updatedAt: now,
    });
    closeModal();
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && closeModal()}>
      <SheetContent size="sm">
        <SheetHeader
          title={initial.id ? "编辑阶段" : "新增阶段"}
          description={initial.id ? undefined : "阶段让长期目标变成可完成的小段路。"}
        />
        <SheetBody className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="阶段">
              <Select value={phase} onChange={(event) => setPhase(event.target.value as StagePhase)}>
                {STAGE_PHASE_ORDER.map((key) => (
                  <option key={key} value={key}>
                    {STAGE_PHASE[key]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="状态">
              <Select
                value={status}
                onChange={(event) => setStatus(event.target.value as Stage["status"])}
              >
                <option value="planned">未开始</option>
                <option value="active">进行中</option>
                <option value="completed">已完成</option>
              </Select>
            </Field>
          </div>
          <Field label="阶段目标" error={error}>
            <Input
              autoFocus
              value={goal}
              placeholder="例如：完成 FLK1 第一轮"
              onChange={(event) => setGoal(event.target.value)}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="开始">
              <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
            </Field>
            <Field label="结束">
              <Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="进度" hint={`${progress}%`}>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={progress}
                onChange={(event) => setProgress(Number(event.target.value))}
                className="mt-3 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-secondary accent-[hsl(var(--primary))]"
              />
            </Field>
            <Field label="目标小时" hint="可选">
              <DecimalInput
                placeholder="90"
                suffix="小时"
                value={targetHours}
                onChange={setTargetHours}
              />
            </Field>
          </div>
          <Field label="备注">
            <Input value={note} onChange={(event) => setNote(event.target.value)} />
          </Field>
          {initial.id && initial.status !== "completed" && (
            <button
              type="button"
              className="text-[13px] text-primary hover:underline"
              onClick={async () => {
                setStatus("completed");
                setProgress(100);
              }}
            >
              标记为已完成，生成阶段小结 →
            </button>
          )}
          {initial.id && (
            <button
              type="button"
              className="text-[13px] text-destructive hover:underline"
              onClick={() =>
                askConfirm({
                  title: "删除这个阶段？",
                  description: "阶段内的记录会被保留，只是不再归属此阶段。",
                  confirmLabel: "删除",
                  destructive: true,
                  onConfirm: async () => {
                    await deleteStage(initial.id!);
                    closeModal();
                  },
                })
              }
            >
              删除阶段
            </button>
          )}
          {initial.id && initial.status === "completed" && initial.completedAt && (
            <p className="text-[12px] text-muted-foreground">
              完成于 {fmtDate(initial.completedAt)}
            </p>
          )}
        </SheetBody>
        <SheetFooter className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="lg" onClick={closeModal}>
            取消
          </Button>
          <Button size="lg" onClick={handleSave}>
            保存
          </Button>
        </SheetFooter>
      </SheetContent>
    </Dialog>
  );
}

export function CourseEditor() {
  const { modal, payload, closeModal, askConfirm } = useUI();
  const open = modal === "course";
  const initial = (payload.initial ?? {}) as Partial<import("@/lib/types").Course>;
  const hobbyId = (payload.hobbyId as string | undefined) ?? initial.hobbyId;
  const { settings, saveCourse, deleteCourse } = useApp();

  const [name, setName] = useState("");
  const [totalPrice, setTotalPrice] = useState<number | undefined>();
  const [currency, setCurrency] = useState<CurrencyCode>("CNY");
  const [totalLessons, setTotalLessons] = useState<number | undefined>();
  const [completedLessons, setCompletedLessons] = useState<number | undefined>();
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setName(initial.name ?? "");
    setTotalPrice(initial.totalPrice);
    setCurrency(initial.currency ?? settings.currency);
    setTotalLessons(initial.totalLessons);
    setCompletedLessons(initial.completedLessons ?? 0);
    setNote(initial.note ?? "");
    setError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function handleSave() {
    if (!name.trim()) {
      setError("给课程起个名字。");
      return;
    }
    if (!totalLessons || totalLessons <= 0) {
      setError("总课时需要大于 0。");
      return;
    }
    const now = new Date().toISOString();
    await saveCourse({
      id: initial.id ?? uid("crs"),
      hobbyId,
      journeyId: (payload.journeyId as string | undefined) ?? initial.journeyId,
      name: name.trim(),
      totalPrice: totalPrice ?? 0,
      currency,
      totalLessons,
      completedLessons: Math.min(completedLessons ?? 0, totalLessons),
      note: note.trim() || undefined,
      createdAt: initial.createdAt ?? now,
      updatedAt: now,
    });
    closeModal();
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && closeModal()}>
      <SheetContent size="sm">
        <SheetHeader title={initial.id ? "编辑课程" : "添加课程"} description="记录总价与课时，自动算出实际利用率。" />
        <SheetBody className="space-y-4">
          <Field label="课程名称" error={error}>
            <Input
              autoFocus
              value={name}
              placeholder="例如：架子鼓私教"
              onChange={(event) => setName(event.target.value)}
            />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="总价">
              <MoneyInput
                placeholder="3600"
                currency={currency}
                value={totalPrice}
                onChange={setTotalPrice}
              />
            </Field>
            <Field label="总课时">
              <Input
                inputMode="numeric"
                className="numeral"
                placeholder="20"
                value={totalLessons ?? ""}
                onChange={(event) => {
                  const raw = event.target.value.replace(/[^\d]/g, "");
                  setTotalLessons(raw === "" ? undefined : Number(raw));
                }}
              />
            </Field>
            <Field label="已完成">
              <Input
                inputMode="numeric"
                className="numeral"
                placeholder="7"
                value={completedLessons ?? ""}
                onChange={(event) => {
                  const raw = event.target.value.replace(/[^\d]/g, "");
                  setCompletedLessons(raw === "" ? undefined : Number(raw));
                }}
              />
            </Field>
          </div>
          {totalPrice && totalLessons ? (
            <p className="text-[12.5px] text-muted-foreground">
              每节课成本约 {fmtMoney(totalPrice / totalLessons, { currency })}
            </p>
          ) : null}
          <Field label="币种">
            <CurrencyPicker value={currency} onChange={setCurrency} />
          </Field>
          <Field label="备注">
            <Input value={note} onChange={(event) => setNote(event.target.value)} />
          </Field>
        </SheetBody>
        <SheetFooter className="flex items-center gap-2">
          {initial.id && (
            <Button
              variant="destructive"
              size="lg"
              onClick={() =>
                askConfirm({
                  title: "删除这门课程？",
                  description: "已经记录的课程记录会保留。",
                  confirmLabel: "删除",
                  destructive: true,
                  onConfirm: async () => {
                    await deleteCourse(initial.id!);
                    closeModal();
                  },
                })
              }
            >
              删除
            </Button>
          )}
          <Button variant="ghost" size="lg" className="ml-auto" onClick={closeModal}>
            取消
          </Button>
          <Button size="lg" onClick={handleSave}>
            保存
          </Button>
        </SheetFooter>
      </SheetContent>
    </Dialog>
  );
}
