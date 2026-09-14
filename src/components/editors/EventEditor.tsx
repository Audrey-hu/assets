import { useEffect, useMemo, useState } from "react";
import { Dialog } from "@radix-ui/react-dialog";
import { SheetContent, SheetFooter, SheetHeader, SheetBody } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Chip, Field, Input, Select, Textarea } from "@/components/ui/form";
import { CurrencyPicker, DecimalInput, MoneyInput, TargetPicker, TimeInput } from "./fields";
import { PhotoGrid, PhotoPickerInput } from "@/components/PhotoGrid";
import { useApp } from "@/store/app-store";
import { useEditors, useUI } from "@/store/ui-store";
import { EXPENSE_CATEGORY, EXPENSE_CATEGORY_ORDER, MOOD, MOOD_ORDER, TIME_CATEGORY, TIME_CATEGORY_ORDER } from "@/lib/labels";
import { fmtDate, minutesBetween, todayISO } from "@/lib/format";
import type { CurrencyCode } from "@/lib/format";
import { uid } from "@/lib/utils";
import type { EventType, ExpenseCategory, LifeEvent, Mood, TimeCategory } from "@/lib/types";
import { cn } from "@/lib/utils";

const TYPES: { value: EventType; label: string }[] = [
  { value: "session", label: "时间" },
  { value: "expense", label: "支出" },
  { value: "income", label: "收入" },
  { value: "milestone", label: "里程碑" },
  { value: "result", label: "成绩" },
  { value: "reflection", label: "反思" },
  { value: "feedback", label: "反馈" },
  { value: "decision", label: "决定" },
  { value: "document", label: "文件" },
  { value: "note", label: "笔记" },
  { value: "meeting", label: "会面" },
];

const QUICK_MINUTES = [15, 30, 45, 60, 90, 120];

export function EventEditor() {
  const { modal, payload, closeModal, askConfirm } = useUI();
  const open = modal === "event";
  const initial = (payload.initial ?? {}) as Partial<LifeEvent>;
  const lockType = payload.lockType as EventType | undefined;
  const heading = (payload.heading as string | undefined) ?? (initial.id ? "编辑记录" : "新增记录");

  const { settings, saveEvent, deleteEvent, addPhotos, deletePhotos } = useApp();
  const { newAsset } = useEditors();
  const [type, setType] = useState<EventType>(lockType ?? initial.type ?? "session");
  const [title, setTitle] = useState(initial.title ?? "");
  const [date, setDate] = useState(initial.date ?? todayISO());
  const [startTime, setStartTime] = useState<string | undefined>(initial.startTime);
  const [endTime, setEndTime] = useState<string | undefined>(initial.endTime);
  const [durationRaw, setDurationRaw] = useState<number | undefined>(initial.durationMin);
  const [durationTouched, setDurationTouched] = useState(Boolean(initial.durationMin));
  const [amount, setAmount] = useState<number | undefined>(initial.amount);
  const [currency, setCurrency] = useState<CurrencyCode>(initial.currency ?? "CNY");
  const [expenseCategory, setExpenseCategory] = useState<ExpenseCategory>(
    initial.expenseCategory ?? "course",
  );
  const [timeCategory, setTimeCategory] = useState<TimeCategory | undefined>(initial.timeCategory);
  const [mood, setMood] = useState<Mood | undefined>(initial.mood);
  const [note, setNote] = useState(initial.note ?? "");
  const [person, setPerson] = useState(initial.person ?? "");
  const [score, setScore] = useState<number | undefined>(
    typeof initial.meta?.score === "number" ? Number(initial.meta.score) : undefined,
  );
  const [hobbyId, setHobbyId] = useState<string | undefined>(initial.hobbyId);
  const [journeyId, setJourneyId] = useState<string | undefined>(initial.journeyId);
  const [photoIds, setPhotoIds] = useState<string[]>(initial.photoIds ?? []);
  const [errors, setErrors] = useState<Record<string, string>>({});

  /* reset when the modal is re-opened with different payload */
  useEffect(() => {
    if (!open) return;
    setType(lockType ?? initial.type ?? "session");
    setTitle(initial.title ?? "");
    setDate(initial.date ?? todayISO());
    setStartTime(initial.startTime);
    setEndTime(initial.endTime);
    setDurationRaw(initial.durationMin);
    setDurationTouched(Boolean(initial.durationMin));
    setAmount(initial.amount);
    setCurrency(initial.currency ?? settings.currency);
    setExpenseCategory(initial.expenseCategory ?? "course");
    setTimeCategory(initial.timeCategory);
    setMood(initial.mood);
    setNote(initial.note ?? "");
    setPerson(initial.person ?? "");
    setScore(typeof initial.meta?.score === "number" ? Number(initial.meta.score) : undefined);
    setHobbyId(initial.hobbyId);
    setJourneyId(initial.journeyId);
    setPhotoIds(initial.photoIds ?? []);
    setErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const derivedDuration = useMemo(() => {
    if (startTime && endTime) return minutesBetween(startTime, endTime);
    return undefined;
  }, [startTime, endTime]);

  const effectiveDuration = durationTouched ? durationRaw : (derivedDuration ?? durationRaw);
  const isTime = type === "session" || type === "meeting";

  function validate() {
    const next: Record<string, string> = {};
    if (!title.trim()) next.title = "写一句标题，方便以后回看。";
    if (!date) next.date = "需要选择日期。";
    if (type === "expense" && !(amount && amount > 0)) next.amount = "支出金额需要大于 0。";
    if (type === "session" && !(effectiveDuration && effectiveDuration > 0) && !startTime) {
      next.duration = "填写时长，或选择开始与结束时间。";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    const now = new Date().toISOString();
    const event: LifeEvent = {
      id: initial.id ?? uid("evt"),
      type,
      date,
      startTime: isTime ? startTime : undefined,
      endTime: isTime ? endTime : undefined,
      durationMin: isTime ? effectiveDuration : undefined,
      amount,
      currency: amount === undefined ? undefined : currency,
      moneyType: type === "expense" ? "expense" : type === "income" ? "income" : initial.moneyType,
      expenseCategory: type === "expense" ? expenseCategory : initial.expenseCategory,
      title: title.trim(),
      note: note.trim() || undefined,
      mood: type === "session" ? mood : initial.mood,
      photoIds,
      hobbyId,
      journeyId,
      stageId: initial.stageId,
      courseId: initial.courseId,
      assetId: initial.assetId,
      incomeId: initial.incomeId,
      timeCategory: isTime ? timeCategory : initial.timeCategory,
      person: type === "meeting" ? person.trim() || undefined : initial.person,
      meta:
        type === "result" && score !== undefined
          ? { ...(initial.meta ?? {}), score }
          : initial.meta,
      createdAt: initial.createdAt ?? now,
      updatedAt: now,
    };
    await saveEvent(event);
    closeModal();
  }

  function handleDelete() {
    if (!initial.id) return;
    askConfirm({
      title: "删除这条记录？",
      description: "连同照片一起删除，无法恢复。",
      confirmLabel: "删除",
      destructive: true,
      onConfirm: async () => {
        await deleteEvent(initial.id!);
        closeModal();
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && closeModal()}>
      <SheetContent aria-describedby={undefined}>
        <SheetHeader
          title={heading}
          description={initial.id ? fmtDate(initial.date ?? date) : "记下此刻，之后会自动出现在时间线里。"}
        />
        <SheetBody className="space-y-4">
          {!lockType && (
            <div className="flex flex-wrap gap-1.5">
              {TYPES.map((item) => (
                <Chip
                  key={item.value}
                  active={type === item.value}
                  onClick={() => setType(item.value)}
                >
                  {item.label}
                </Chip>
              ))}
            </div>
          )}

          <Field label="标题" error={errors.title}>
            <Input
              autoFocus
              value={title}
              placeholder={
                type === "expense"
                  ? "例如：电子鼓"
                  : type === "milestone"
                    ? "例如：累计练习 40 小时"
                    : "例如：Contract Law 精读"
              }
              onChange={(event) => setTitle(event.target.value)}
            />
          </Field>

          <div className={cn("grid gap-3", isTime ? "grid-cols-2 xs:grid-cols-3" : "grid-cols-2")}>
            <Field label="日期" error={errors.date}>
              <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            </Field>
            {isTime && (
              <>
                <Field label="开始">
                  <TimeInput value={startTime} onChange={setStartTime} />
                </Field>
                <Field label="结束">
                  <TimeInput value={endTime} onChange={setEndTime} />
                </Field>
              </>
            )}
          </div>

          {isTime && (
            <Field
              label="时长（分钟）"
              hint={derivedDuration ? `根据时间自动计算 ${derivedDuration} 分钟` : undefined}
              error={errors.duration}
            >
              <div className="space-y-2">
                <Input
                  inputMode="numeric"
                  className="numeral"
                  placeholder={derivedDuration ? String(derivedDuration) : "45"}
                  value={
                    durationTouched
                      ? (durationRaw ?? "")
                      : (derivedDuration ?? durationRaw ?? "")
                  }
                  onChange={(event) => {
                    const raw = event.target.value.replace(/[^\d]/g, "");
                    setDurationTouched(true);
                    setDurationRaw(raw === "" ? undefined : Number(raw));
                  }}
                />
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_MINUTES.map((minutes) => (
                    <Chip
                      key={minutes}
                      active={
                        (durationTouched ? durationRaw : (derivedDuration ?? durationRaw)) === minutes
                      }
                      onClick={() => {
                        setDurationTouched(true);
                        setDurationRaw(minutes);
                      }}
                    >
                      {minutes >= 60 ? `${minutes / 60}h` : `${minutes}m`}
                    </Chip>
                  ))}
                </div>
              </div>
            </Field>
          )}

          {(type === "expense" || type === "income") && (
            <div className="grid grid-cols-2 gap-3">
              <Field label={type === "expense" ? "金额" : "金额"} error={errors.amount}>
                <MoneyInput value={amount} onChange={setAmount} currency={currency} />
              </Field>
              {type === "expense" && (
                <Field label="类型">
                  <Select
                    value={expenseCategory}
                    onChange={(event) => setExpenseCategory(event.target.value as ExpenseCategory)}
                  >
                    {EXPENSE_CATEGORY_ORDER.map((key) => (
                      <option key={key} value={key}>
                        {EXPENSE_CATEGORY[key]}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}
            </div>
          )}

          {(type === "expense" || type === "income") && (
            <Field label="币种" hint="这笔钱用哪种货币记">
              <CurrencyPicker value={currency} onChange={setCurrency} />
            </Field>
          )}

          {isTime && (
            <Field label="时间属于">
              <Select
                value={timeCategory ?? ""}
                onChange={(event) =>
                  setTimeCategory((event.target.value || undefined) as TimeCategory | undefined)
                }
              >
                <option value="">自动判断</option>
                {TIME_CATEGORY_ORDER.map((key) => (
                  <option key={key} value={key}>
                    {TIME_CATEGORY[key].label}
                  </option>
                ))}
              </Select>
            </Field>
          )}

          {type === "result" && (
            <Field label="成绩 / 分数">
              <DecimalInput
                placeholder="58"
                suffix="分"
                value={score}
                onChange={setScore}
              />
            </Field>
          )}

          {type === "meeting" && (
            <Field label="认识的人">
              <Input
                value={person}
                placeholder="例如：Person A"
                onChange={(event) => setPerson(event.target.value)}
              />
            </Field>
          )}

          {type === "session" && (
            <Field label="感觉">
              <div className="flex flex-wrap gap-1.5">
                {MOOD_ORDER.map((key) => (
                  <Chip
                    key={key}
                    active={mood === key}
                    onClick={() => setMood(mood === key ? undefined : key)}
                  >
                    <span aria-hidden>{MOOD[key].emoji}</span>
                    {MOOD[key].label}
                  </Chip>
                ))}
              </div>
            </Field>
          )}

          <TargetPicker
            hobbyId={hobbyId}
            journeyId={journeyId}
            onChange={(value) => {
              setHobbyId(value.hobbyId);
              setJourneyId(value.journeyId);
            }}
          />

          <Field label="记录">
            <Textarea
              value={note}
              placeholder="一句话记录，例如：右脚终于顺了一点。"
              onChange={(event) => setNote(event.target.value)}
            />
          </Field>

          <Field label="照片" hint={`最多 6 张 · ${photoIds.length}/6`}>
            <PhotoGrid
              ids={photoIds}
              onRemove={async (id) => {
                setPhotoIds((prev) => prev.filter((photoId) => photoId !== id));
                if (initial.id) await deletePhotos([id]);
              }}
              max={6}
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

          {type === "milestone" && !initial.id && (
            <button
              type="button"
              onClick={() => {
                closeModal();
                newAsset({ initial: { name: title } });
              }}
              className="text-[13px] text-primary hover:underline"
            >
              这件事留下了什么资产？顺便记一笔 →
            </button>
          )}
        </SheetBody>
        <SheetFooter className="flex items-center gap-2">
          {initial.id && (
            <Button variant="destructive" size="lg" onClick={handleDelete}>
              删除
            </Button>
          )}
          <Button variant="ghost" size="lg" className="ml-auto" onClick={closeModal}>
            取消
          </Button>
          <Button size="lg" onClick={handleSave}>
            {initial.id ? "保存修改" : "保存"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Dialog>
  );
}
