import { useEffect, useState } from "react";
import { Dialog } from "@radix-ui/react-dialog";
import { SheetBody, SheetContent, SheetFooter, SheetHeader } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Chip, Field, Input, Select } from "@/components/ui/form";
import { DecimalInput, MoneyInput } from "./fields";
import { fmtDate, todayISO } from "@/lib/format";
import { uid } from "@/lib/utils";
import { useApp } from "@/store/app-store";
import { useUI } from "@/store/ui-store";
import type { SavingsItem, SavingsKind } from "@/lib/types";
import { addMonths, format, parseISO } from "date-fns";

const KIND_LABEL: Record<SavingsKind, string> = {
  reservoir: "蓄水池",
  emergency: "备用金",
  deposit: "定期存款",
};

export function SavingsEditor() {
  const { modal, payload, closeModal, askConfirm } = useUI();
  const open = modal === "savings";
  const initial = (payload.initial ?? {}) as Partial<SavingsItem>;
  const { saveSavings, deleteSavings } = useApp();

  const [kind, setKind] = useState<SavingsKind>("reservoir");
  const [name, setName] = useState("蓄水池");
  const [current, setCurrent] = useState<number | undefined>();
  const [target, setTarget] = useState<number | undefined>();
  const [monthlyEssential, setMonthlyEssential] = useState<number | undefined>();
  const [bank, setBank] = useState("");
  const [principal, setPrincipal] = useState<number | undefined>();
  const [rate, setRate] = useState<number | undefined>();
  const [termMonths, setTermMonths] = useState<number | undefined>(36);
  const [depositDate, setDepositDate] = useState(todayISO());
  const [autoRenew, setAutoRenew] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    const nextKind = initial.kind ?? "reservoir";
    setKind(nextKind);
    setName(initial.name ?? KIND_LABEL[nextKind]);
    setCurrent(initial.current);
    setTarget(initial.target);
    setMonthlyEssential(initial.monthlyEssential);
    setBank(initial.bank ?? "");
    setPrincipal(initial.principal);
    setRate(initial.rate);
    setTermMonths(initial.termMonths ?? 36);
    setDepositDate(initial.depositDate ?? todayISO());
    setAutoRenew(initial.autoRenew ?? false);
    setNote(initial.note ?? "");
    setError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const maturityDate =
    kind === "deposit" && depositDate && termMonths
      ? format(addMonths(parseISO(depositDate), termMonths), "yyyy-MM-dd")
      : undefined;

  async function handleSave() {
    if (!name.trim()) {
      setError("给它起个名字。");
      return;
    }
    if (kind !== "deposit" && (current === undefined || current < 0)) {
      setError("填写当前金额。");
      return;
    }
    if (kind === "deposit" && (!principal || principal <= 0)) {
      setError("填写本金。");
      return;
    }
    const now = new Date().toISOString();
    await saveSavings({
      id: initial.id ?? uid("sav"),
      kind,
      name: name.trim(),
      current: kind === "deposit" ? undefined : (current ?? 0),
      target: kind === "deposit" ? undefined : target,
      monthlyEssential: kind === "reservoir" ? monthlyEssential : undefined,
      bank: kind === "deposit" ? bank.trim() || undefined : undefined,
      principal: kind === "deposit" ? principal : undefined,
      rate: kind === "deposit" ? rate : undefined,
      termMonths: kind === "deposit" ? termMonths : undefined,
      depositDate: kind === "deposit" ? depositDate : undefined,
      maturityDate: kind === "deposit" ? maturityDate : undefined,
      autoRenew: kind === "deposit" ? autoRenew : undefined,
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
          title={initial.id ? "编辑存款" : "新增存款"}
          description="只记录定期存款、备用金和蓄水池。"
        />
        <SheetBody className="space-y-4">
          <Field label="类型">
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(KIND_LABEL) as SavingsKind[]).map((key) => (
                <Chip
                  key={key}
                  active={kind === key}
                  onClick={() => {
                    setKind(key);
                    if (!initial.id) setName(KIND_LABEL[key]);
                  }}
                  disabled={Boolean(initial.id)}
                >
                  {KIND_LABEL[key]}
                </Chip>
              ))}
            </div>
          </Field>
          <Field label="名称" error={error}>
            <Input value={name} onChange={(event) => setName(event.target.value)} />
          </Field>

          {kind !== "deposit" ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label="当前金额">
                  <MoneyInput value={current} onChange={setCurrent} />
                </Field>
                <Field label="目标金额" hint="可选">
                  <MoneyInput value={target} onChange={setTarget} />
                </Field>
              </div>
              {kind === "reservoir" && (
                <Field label="每月必要开支" hint="用于计算安全月数">
                  <MoneyInput value={monthlyEssential} onChange={setMonthlyEssential} />
                </Field>
              )}
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label="银行">
                  <Input
                    value={bank}
                    placeholder="例如：招商银行"
                    onChange={(event) => setBank(event.target.value)}
                  />
                </Field>
                <Field label="本金">
                  <MoneyInput value={principal} onChange={setPrincipal} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="年利率" hint="%">
                  <DecimalInput
                    placeholder="1.70"
                    suffix="%"
                    value={rate}
                    onChange={setRate}
                  />
                </Field>
                <Field label="存期" hint="月">
                  <Select
                    value={String(termMonths ?? 36)}
                    onChange={(event) => setTermMonths(Number(event.target.value))}
                  >
                    {[3, 6, 12, 24, 36, 60].map((m) => (
                      <option key={m} value={m}>
                        {m} 个月
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="存入日期">
                  <Input
                    type="date"
                    value={depositDate}
                    onChange={(event) => setDepositDate(event.target.value)}
                  />
                </Field>
                <Field label="到期日">
                  <div className="flex h-11 items-center rounded-md border border-border/70 bg-secondary/50 px-3 text-[14px] numeral text-muted-foreground">
                    {maturityDate ? fmtDate(maturityDate) : "—"}
                  </div>
                </Field>
              </div>
              <Chip active={autoRenew} onClick={() => setAutoRenew(!autoRenew)}>
                到期自动转存
              </Chip>
            </>
          )}

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
                  title: "删除这条存款记录？",
                  description: "相关的存取记录也会一起删除。",
                  confirmLabel: "删除",
                  destructive: true,
                  onConfirm: async () => {
                    await deleteSavings(initial.id!);
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

export function SavingsTxEditor() {
  const { modal, payload, closeModal } = useUI();
  const open = modal === "savingsTx";
  const itemId = payload.itemId as string;
  const { data, saveSavings, saveSavingsTx } = useApp();
  const item = data.savings.find((s) => s.id === itemId);

  const [amount, setAmount] = useState<number | undefined>();
  const [reason, setReason] = useState("");
  const [date, setDate] = useState(todayISO());
  const [direction, setDirection] = useState<"in" | "out">("in");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setAmount(undefined);
    setReason("");
    setDate(todayISO());
    setDirection("in");
    setError("");
  }, [open]);

  async function handleSave() {
    if (!amount || amount <= 0) {
      setError("填写金额。");
      return;
    }
    if (!reason.trim()) {
      setError("写一句原因。");
      return;
    }
    if (!item) return;
    const signed = direction === "in" ? amount : -amount;
    const now = new Date().toISOString();
    await saveSavingsTx({
      id: uid("stx"),
      itemId,
      amount: signed,
      reason: reason.trim(),
      date,
      createdAt: now,
    });
    await saveSavings({
      ...item,
      current: Math.max(0, (item.current ?? 0) + signed),
      updatedAt: now,
    });
    closeModal();
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && closeModal()}>
      <SheetContent size="sm">
        <SheetHeader title={item ? `${item.name} · 记录变动` : "记录变动"} description="存入或取出，都会进入记录。" />
        <SheetBody className="space-y-4">
          <Field label="方向">
            <div className="flex gap-1.5">
              <Chip active={direction === "in"} onClick={() => setDirection("in")}>
                存入
              </Chip>
              <Chip active={direction === "out"} onClick={() => setDirection("out")}>
                取出
              </Chip>
            </div>
          </Field>
          <Field label="金额" error={error}>
            <MoneyInput value={amount} onChange={setAmount} />
          </Field>
          <Field label="原因">
            <Input
              value={reason}
              placeholder="例如：笔记本维修"
              onChange={(event) => setReason(event.target.value)}
            />
          </Field>
          <Field label="日期">
            <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </Field>
          {item && (
            <p className="text-[12.5px] text-muted-foreground">
              当前 ¥{(item.current ?? 0).toLocaleString("en-US")} →{" "}
              <span className="numeral text-foreground">
                ¥
                {Math.max(
                  0,
                  (item.current ?? 0) + (direction === "in" ? (amount ?? 0) : -(amount ?? 0)),
                ).toLocaleString("en-US")}
              </span>
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
