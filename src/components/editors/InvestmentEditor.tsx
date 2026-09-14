import { useEffect, useMemo, useState } from "react";
import { Dialog } from "@radix-ui/react-dialog";
import { SheetBody, SheetContent, SheetFooter, SheetHeader } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Chip, Field, Input, Textarea } from "@/components/ui/form";
import { MoneyInput } from "./fields";
import { fmtMoney, todayISO } from "@/lib/format";
import { investmentCategories, investmentStats } from "@/lib/stats";
import { useApp } from "@/store/app-store";
import { useUI } from "@/store/ui-store";
import { uid } from "@/lib/utils";
import type { Investment } from "@/lib/types";

export function InvestmentEditor() {
  const { modal, payload, closeModal, askConfirm } = useUI();
  const open = modal === "investment";
  const initial = (payload.initial ?? {}) as Partial<Investment>;
  const { data, saveInvestment, deleteInvestment } = useApp();

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [cost, setCost] = useState<number | undefined>();
  const [value, setValue] = useState<number | undefined>();
  const [startDate, setStartDate] = useState(todayISO());
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setName(initial.name ?? "");
    setCategory(initial.category ?? "");
    setCost(initial.cost);
    setValue(initial.value);
    setStartDate(initial.startDate ?? todayISO());
    setNote(initial.note ?? "");
    setError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  /* 用过的类别排在前面，用户可以随便加新的 */
  const suggestions = useMemo(() => investmentCategories(data.investments), [data.investments]);
  const totals = useMemo(() => investmentStats(data.investments), [data.investments]);

  async function handleSave() {
    if (!name.trim()) {
      setError("给这笔投资起个名字。");
      return;
    }
    if (cost === undefined || cost < 0) {
      setError("填写投入本金。");
      return;
    }
    const now = new Date().toISOString();
    const valueChanged = value !== initial.value;
    await saveInvestment({
      id: initial.id ?? uid("inv"),
      name: name.trim(),
      category: category.trim() || "其他",
      cost,
      value,
      startDate,
      valueUpdatedAt: value === undefined ? undefined : valueChanged ? now : (initial.valueUpdatedAt ?? now),
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
          title={initial.id ? "编辑理财" : "新增理财"}
          description="黄金、基金、股票、数字货币……类别你自己定。"
        />
        <SheetBody className="space-y-4">
          <Field label="名称" error={error}>
            <Input
              autoFocus
              value={name}
              placeholder="例如：黄金积存 / 沪深300 / 比特币"
              onChange={(event) => setName(event.target.value)}
            />
          </Field>

          <Field label="类别" hint="可以自己输，用过的会留在上面">
            <Input
              value={category}
              placeholder="例如：黄金"
              onChange={(event) => setCategory(event.target.value)}
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {suggestions.map((item) => (
                <Chip
                  key={item}
                  active={category === item}
                  onClick={() => setCategory(category === item ? "" : item)}
                >
                  {item}
                </Chip>
              ))}
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="投入本金">
              <MoneyInput value={cost} onChange={setCost} />
            </Field>
            <Field label="当前市值" hint="可以不填">
              <MoneyInput value={value} onChange={setValue} />
            </Field>
          </div>

          {value !== undefined && cost !== undefined && cost > 0 && (
            <div className="surface flex items-center justify-between px-3.5 py-3">
              <span className="text-[13px] text-muted-foreground">这笔盈亏</span>
              <span className="flex items-baseline gap-2">
                <span
                  className={
                    value - cost >= 0
                      ? "numeral text-[16px] font-medium text-primary"
                      : "numeral text-[16px] font-medium text-[#A9765A]"
                  }
                >
                  {value - cost >= 0 ? "+" : "−"}
                  {fmtMoney(Math.abs(value - cost))}
                </span>
                <span className="numeral text-[12.5px] text-muted-foreground">
                  {((value - cost) / cost * 100).toFixed(1)}%
                </span>
              </span>
            </div>
          )}

          <Field label="开始日期">
            <Input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </Field>

          <Field label="备注">
            <Textarea
              value={note}
              placeholder="例如：每月定投 1000"
              onChange={(event) => setNote(event.target.value)}
            />
          </Field>

          {data.investments.length > 0 && (
            <p className="text-[12.5px] leading-relaxed text-muted-foreground">
              当前合计投入 {fmtMoney(totals.cost)}，市值 {fmtMoney(totals.value)}
              {totals.missing > 0 ? `（其中 ${totals.missing} 笔还没更新市值，按本金计）` : ""}
            </p>
          )}
        </SheetBody>
        <SheetFooter className="flex items-center gap-2">
          {initial.id && (
            <Button
              variant="destructive"
              size="lg"
              onClick={() =>
                askConfirm({
                  title: `删除「${initial.name}」？`,
                  description: "这笔投资记录会被移除，无法恢复。",
                  confirmLabel: "删除",
                  destructive: true,
                  onConfirm: async () => {
                    await deleteInvestment(initial.id!);
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
