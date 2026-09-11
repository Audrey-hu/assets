import { useEffect, useState } from "react";
import { Dialog } from "@radix-ui/react-dialog";
import { SheetBody, SheetContent, SheetFooter, SheetHeader } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { AccentPicker, EmojiPicker } from "./fields";
import { HOBBY_ICONS, HOBBY_STATUS } from "@/lib/labels";
import { todayISO } from "@/lib/format";
import { uid } from "@/lib/utils";
import { useApp } from "@/store/app-store";
import { useUI } from "@/store/ui-store";
import type { AccentKey, Hobby, HobbyStatus } from "@/lib/types";

const STATUS_ORDER: HobbyStatus[] = ["trying", "building", "active", "deep", "paused", "archived"];

export function HobbyEditor() {
  const { modal, payload, closeModal, askConfirm } = useUI();
  const open = modal === "hobby";
  const initial = (payload.initial ?? {}) as Partial<Hobby>;
  const { saveHobby, deleteHobby } = useApp();

  const [name, setName] = useState("");
  const [icon, setIcon] = useState("🥁");
  const [accent, setAccent] = useState<AccentKey>("sage");
  const [startDate, setStartDate] = useState(todayISO());
  const [status, setStatus] = useState<HobbyStatus>("trying");
  const [goalSessions, setGoalSessions] = useState<number | undefined>();
  const [goalMinutes, setGoalMinutes] = useState<number | undefined>();
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setName(initial.name ?? "");
    setIcon(initial.icon ?? "🥁");
    setAccent(initial.accent ?? "sage");
    setStartDate(initial.startDate ?? todayISO());
    setStatus(initial.status ?? "trying");
    setGoalSessions(initial.weeklyGoalSessions);
    setGoalMinutes(initial.weeklyGoalMinutes);
    setNote(initial.note ?? "");
    setError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function handleSave() {
    if (!name.trim()) {
      setError("给这个兴趣起个名字。");
      return;
    }
    const now = new Date().toISOString();
    await saveHobby({
      id: initial.id ?? uid("hob"),
      name: name.trim(),
      icon,
      accent,
      startDate,
      status,
      weeklyGoalSessions: goalSessions,
      weeklyGoalMinutes: goalMinutes,
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
          title={initial.id ? "编辑兴趣" : "新增兴趣"}
          description="一个兴趣是一个长期项目，不是一笔消费。"
        />
        <SheetBody className="space-y-4">
          <Field label="名称" error={error}>
            <Input
              autoFocus
              value={name}
              placeholder="例如：架子鼓"
              onChange={(event) => setName(event.target.value)}
            />
          </Field>
          <EmojiPicker value={icon} onChange={setIcon} options={HOBBY_ICONS} />
          <AccentPicker value={accent} onChange={setAccent} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="开始日期">
              <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
            </Field>
            <Field label="当前状态">
              <Select
                value={status}
                onChange={(event) => setStatus(event.target.value as HobbyStatus)}
              >
                {STATUS_ORDER.map((key) => (
                  <option key={key} value={key}>
                    {HOBBY_STATUS[key]}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="每周目标次数" hint="可选">
              <Input
                inputMode="numeric"
                className="numeral"
                placeholder="3"
                value={goalSessions ?? ""}
                onChange={(event) => {
                  const raw = event.target.value.replace(/[^\d]/g, "");
                  setGoalSessions(raw === "" ? undefined : Number(raw));
                }}
              />
            </Field>
            <Field label="每周目标时间" hint="分钟">
              <Input
                inputMode="numeric"
                className="numeral"
                placeholder="180"
                value={goalMinutes ?? ""}
                onChange={(event) => {
                  const raw = event.target.value.replace(/[^\d]/g, "");
                  setGoalMinutes(raw === "" ? undefined : Number(raw));
                }}
              />
            </Field>
          </div>
          <Field label="备注">
            <Textarea
              value={note}
              placeholder="为什么开始？想做到什么程度？"
              onChange={(event) => setNote(event.target.value)}
            />
          </Field>
          <div className="rounded-lg border border-border/70 bg-secondary/40 px-3.5 py-3 text-[12.5px] leading-relaxed text-muted-foreground">
            长期主义允许暂停。暂时不想练的时候，把状态改成「暂停」就好。
          </div>
        </SheetBody>
        <SheetFooter className="flex items-center gap-2">
          {initial.id && (
            <Button
              variant="destructive"
              size="lg"
              onClick={() =>
                askConfirm({
                  title: `删除「${initial.name}」？`,
                  description: "这个兴趣下的所有时间记录、课程与照片都会一起删除。",
                  confirmLabel: "删除",
                  destructive: true,
                  onConfirm: async () => {
                    await deleteHobby(initial.id!);
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
