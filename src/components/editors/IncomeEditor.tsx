import { useEffect, useState } from "react";
import { Dialog } from "@radix-ui/react-dialog";
import { SheetBody, SheetContent, SheetFooter, SheetHeader } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Chip, Field, Input, Select, Textarea } from "@/components/ui/form";
import { DecimalInput, MoneyInput } from "./fields";
import { INCOME_TYPE } from "@/lib/labels";
import { fmtMoney, todayISO } from "@/lib/format";
import { uid } from "@/lib/utils";
import { useApp } from "@/store/app-store";
import { useUI } from "@/store/ui-store";
import type { IncomeProject, IncomeType } from "@/lib/types";

export function IncomeEditor() {
  const { modal, payload, closeModal, askConfirm } = useUI();
  const open = modal === "income";
  const initial = (payload.initial ?? {}) as Partial<IncomeProject>;
  const { data, saveIncome, deleteIncome } = useApp();

  const [name, setName] = useState("");
  const [type, setType] = useState<IncomeType>("oneoff");
  const [revenue, setRevenue] = useState<number | undefined>();
  const [cost, setCost] = useState<number | undefined>();
  const [hours, setHours] = useState<number | undefined>();
  const [date, setDate] = useState(todayISO());
  const [assetId, setAssetId] = useState<string>("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setName(initial.name ?? "");
    setType(initial.type ?? "oneoff");
    setRevenue(initial.revenue);
    setCost(initial.cost);
    setHours(initial.minutes ? Math.round((initial.minutes / 60) * 10) / 10 : undefined);
    setDate(initial.date ?? todayISO());
    setAssetId(initial.assetId ?? "");
    setNote(initial.note ?? "");
    setError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const minutes = hours ? Math.round(hours * 60) : 0;
  const net = (revenue ?? 0) - (cost ?? 0);
  const hourly = minutes > 0 ? net / (minutes / 60) : 0;

  async function handleSave() {
    if (!name.trim()) {
      setError("给这个项目起个名字。");
      return;
    }
    if (!revenue || revenue <= 0) {
      setError("收入需要大于 0。");
      return;
    }
    const now = new Date().toISOString();
    await saveIncome({
      id: initial.id ?? uid("inc"),
      name: name.trim(),
      type,
      revenue,
      cost: cost ?? 0,
      minutes,
      date,
      assetId: assetId || undefined,
      hobbyId: initial.hobbyId,
      journeyId: initial.journeyId,
      note: note.trim() || undefined,
      createdAt: initial.createdAt ?? now,
      updatedAt: now,
    });
    closeModal();
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && closeModal()}>
      <SheetContent>
        <SheetHeader title={initial.id ? "编辑项目" : "新增业余收入"} description="下班之后赚到的钱，也值得被记录。" />
        <SheetBody className="space-y-4">
          <Field label="项目名称" error={error}>
            <Input
              autoFocus
              value={name}
              placeholder="例如：MakeChoice 网站"
              onChange={(event) => setName(event.target.value)}
            />
          </Field>
          <Field label="收入类型">
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(INCOME_TYPE) as IncomeType[]).map((key) => (
                <Chip key={key} active={type === key} onClick={() => setType(key)}>
                  {INCOME_TYPE[key]}
                </Chip>
              ))}
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="收入">
              <MoneyInput value={revenue} onChange={setRevenue} />
            </Field>
            <Field label="成本">
              <MoneyInput value={cost} onChange={setCost} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="投入时间" hint="小时">
              <DecimalInput
                placeholder="5"
                suffix="小时"
                value={hours}
                onChange={setHours}
              />
            </Field>
            <Field label="日期">
              <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            </Field>
          </div>

          <div className="surface flex items-center justify-between gap-4 px-3.5 py-3">
            <div>
              <div className="label-caps">净收入</div>
              <div className="mt-1 numeral text-[20px] font-medium text-foreground">
                {fmtMoney(net)}
              </div>
            </div>
            <div className="text-right">
              <div className="label-caps">时薪</div>
              <div className="mt-1 numeral text-[20px] font-medium text-primary">
                {minutes > 0 ? `${fmtMoney(hourly)}/h` : "—"}
              </div>
            </div>
          </div>

          <Field label="关联沉淀资产" hint="可选">
            <Select value={assetId} onChange={(event) => setAssetId(event.target.value)}>
              <option value="">不关联</option>
              {data.assets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="备注">
            <Textarea value={note} onChange={(event) => setNote(event.target.value)} />
          </Field>
        </SheetBody>
        <SheetFooter className="flex items-center gap-2">
          {initial.id && (
            <Button
              variant="destructive"
              size="lg"
              onClick={() =>
                askConfirm({
                  title: "删除这个项目？",
                  description: "收入记录会被移除，关联的资产不会删除。",
                  confirmLabel: "删除",
                  destructive: true,
                  onConfirm: async () => {
                    await deleteIncome(initial.id!);
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
