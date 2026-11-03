import { useEffect, useMemo, useState } from "react";
import { Dialog } from "@radix-ui/react-dialog";
import { SheetBody, SheetContent, SheetFooter, SheetHeader } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Chip, Field, Input, Textarea } from "@/components/ui/form";
import { AccentPicker, CurrencyPicker, EmojiPicker, MoneyInput } from "./fields";
import { fmtMoney, sumMoney, todayISO } from "@/lib/format";
import { Money } from "@/components/ui/money";
import { useApp } from "@/store/app-store";
import { useUI } from "@/store/ui-store";
import { uid } from "@/lib/utils";
import type { SpendCategory, SpendEntry } from "@/lib/types";
import type { CurrencyCode } from "@/lib/format";

const EMOJIS = [
  "🎮",
  "🧥",
  "☕️",
  "🎧",
  "📚",
  "🍜",
  "✈️",
  "🎁",
  "🏠",
  "💄",
  "🚕",
  "💊",
  "🐱",
  "🪴",
  "🎬",
  "🏋️",
];

function parseTags(text: string): string[] {
  return [
    ...new Set(
      text
        .split(/[,，、;；\n]/)
        .map((tag) => tag.trim())
        .filter(Boolean)
        .slice(0, 8),
    ),
  ];
}

/* ------------------------------------------------------------------ *
 * 分类编辑器：名字、图标、预算、常用细分
 * ------------------------------------------------------------------ */

export function SpendCategoryEditor() {
  const { modal, payload, closeModal, askConfirm } = useUI();
  const open = modal === "spendCategory";
  const initial = (payload.initial ?? {}) as Partial<SpendCategory>;
  const { data, settings, saveSpendCategory, deleteSpendCategory } = useApp();

  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🎮");
  const [accent, setAccent] = useState<SpendCategory["accent"]>("clay");
  const [budget, setBudget] = useState<number | undefined>();
  const [budgetCurrency, setBudgetCurrency] = useState<CurrencyCode>("CNY");
  const [tagsText, setTagsText] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setName(initial.name ?? "");
    setEmoji(initial.emoji ?? "🎮");
    setAccent(initial.accent ?? "clay");
    setBudget(initial.monthlyBudget);
    setBudgetCurrency(initial.budgetCurrency ?? settings.currency);
    setTagsText((initial.tags ?? []).join("、"));
    setNote(initial.note ?? "");
    setError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const tags = useMemo(() => parseTags(tagsText), [tagsText]);
  const related = data.spendEntries.filter((entry) => entry.categoryId === initial.id);
  const relatedTotal = sumMoney(related);

  async function handleSave() {
    if (!name.trim()) {
      setError("给这一类起个名字，比如「游戏」「衣服」。");
      return;
    }
    const now = new Date().toISOString();
    await saveSpendCategory({
      id: initial.id ?? uid("spc"),
      name: name.trim(),
      emoji,
      accent,
      monthlyBudget: budget && budget > 0 ? budget : undefined,
      budgetCurrency: budget && budget > 0 ? budgetCurrency : undefined,
      tags: tags.length ? tags : undefined,
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
          title={initial.id ? "编辑分类" : "新建开销分类"}
          description="只记你在乎的那几类。分类怎么分，你说了算。"
        />
        <SheetBody className="space-y-4">
          <Field label="名称" error={error}>
            <Input
              autoFocus
              value={name}
              placeholder="例如：游戏 / 衣服 / 咖啡"
              onChange={(event) => setName(event.target.value)}
            />
          </Field>

          <EmojiPicker value={emoji} onChange={setEmoji} options={EMOJIS} />
          <AccentPicker value={accent} onChange={setAccent} />

          <div className="grid grid-cols-[1fr_auto] items-end gap-2">
            <Field label="每月预算" hint="可不填，只影响这一类自己的进度">
              <MoneyInput value={budget} onChange={setBudget} currency={budgetCurrency} />
            </Field>
            <CurrencyPicker value={budgetCurrency} onChange={setBudgetCurrency} />
          </div>

          <Field
            label="常用细分"
            hint="用逗号分隔。比如衣服可以分「自己买的、妈妈买的」"
          >
            <Input
              value={tagsText}
              placeholder="自己买的、妈妈买的"
              onChange={(event) => setTagsText(event.target.value)}
            />
            {tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-secondary px-2 py-0.5 text-[12px] text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </Field>

          <Field label="备注">
            <Textarea
              value={note}
              placeholder="例如：只记我自己付的部分"
              onChange={(event) => setNote(event.target.value)}
            />
          </Field>

          {initial.id && related.length > 0 && (
            <p className="text-[12.5px] leading-relaxed text-muted-foreground">
              这一类目前有 {related.length} 笔记录，合计{" "}
              <Money map={relatedTotal} className="text-foreground/80" />（不同币种不折算）。
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
                  description:
                    related.length > 0
                      ? `这个分类下的 ${related.length} 笔记录也会一起删除，无法恢复。`
                      : "这个分类会被移除，无法恢复。",
                  confirmLabel: "删除",
                  destructive: true,
                  onConfirm: async () => {
                    await deleteSpendCategory(initial.id!);
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

/* ------------------------------------------------------------------ *
 * 记账编辑器：分类 + 金额 + 币种 + 细分
 * ------------------------------------------------------------------ */

export function SpendEntryEditor() {
  const { modal, payload, closeModal, askConfirm } = useUI();
  const open = modal === "spendEntry";
  const initial = (payload.initial ?? {}) as Partial<SpendEntry>;
  const { data, settings, saveSpendEntry, deleteSpendEntry, saveSpendCategory } = useApp();

  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState<number | undefined>();
  const [currency, setCurrency] = useState<CurrencyCode>("CNY");
  const [savingsItemId, setSavingsItemId] = useState("");
  const [date, setDate] = useState(todayISO());
  const [tag, setTag] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  useEffect(() => {
    if (!open) return;
    setCategoryId(initial.categoryId ?? data.spendCategories[0]?.id ?? "");
    setAmount(initial.amount);
    setCurrency(initial.currency ?? settings.currency);
    setSavingsItemId(initial.savingsItemId ?? "");
    setDate(initial.date ?? todayISO());
    setTag(initial.tag ?? "");
    setNote(initial.note ?? "");
    setError("");
    setCreating(false);
    setNewCategoryName("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const category = data.spendCategories.find((item) => item.id === categoryId);
  const suggestions = category?.tags ?? [];

  /* 只有「还有余额」的储蓄能作为来源，并且币种要对得上 */
  const savingsOptions = useMemo(
    () =>
      data.savings.filter(
        (item) =>
          (item.kind === "envelope" || item.kind === "reservoir" || item.kind === "emergency") &&
          (item.currency ?? settings.currency) === currency,
      ),
    [data.savings, currency, settings.currency],
  );
  const savingsItem = savingsOptions.find((item) => item.id === savingsItemId);
  /* 编辑时这笔钱已经扣过了，判断余额要先把旧的那笔加回来 */
  const savingsAvailable = savingsItem
    ? (savingsItem.current ?? 0) +
      (initial.id && initial.savingsItemId === savingsItem.id ? (initial.amount ?? 0) : 0)
    : 0;
  const insufficient =
    Boolean(savingsItem) && amount !== undefined && amount > savingsAvailable + 0.004;

  async function createCategoryInline() {
    const name = newCategoryName.trim();
    if (!name) return;
    const now = new Date().toISOString();
    const next: SpendCategory = {
      id: uid("spc"),
      name,
      emoji: "🧾",
      accent: "steel",
      createdAt: now,
      updatedAt: now,
    };
    await saveSpendCategory(next);
    setCategoryId(next.id);
    setTag("");
    setCreating(false);
    setNewCategoryName("");
  }

  async function handleSave() {
    if (!categoryId) {
      setError("先选一个分类。还没有分类的话，点下面的「新建分类」。");
      return;
    }
    if (amount === undefined || amount <= 0) {
      setError("填写金额。");
      return;
    }
    if (insufficient) {
      setError("这个储蓄里的余额不够，换个来源或先补一点。");
      return;
    }
    const now = new Date().toISOString();
    await saveSpendEntry({
      id: initial.id ?? uid("spe"),
      categoryId,
      tag: tag.trim() || undefined,
      amount,
      currency,
      savingsItemId: savingsItemId || undefined,
      date,
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
          title={initial.id ? "编辑这笔开销" : "记一笔开销"}
          description="只记你在乎的类别，不用把每一笔流水都记下来。"
        />
        <SheetBody className="space-y-4">
          <Field label="分类" error={error}>
            <div className="flex flex-wrap gap-1.5">
              {data.spendCategories.map((item) => (
                <Chip
                  key={item.id}
                  active={categoryId === item.id}
                  onClick={() => {
                    setCategoryId(item.id);
                    if (tag && !(item.tags ?? []).includes(tag)) setTag("");
                  }}
                >
                  <span aria-hidden>{item.emoji ?? "•"}</span>
                  {item.name}
                </Chip>
              ))}
              <Chip onClick={() => setCreating((prev) => !prev)}>
                ＋ 新建分类
              </Chip>
            </div>
            {creating && (
              <div className="mt-2 flex gap-2">
                <Input
                  autoFocus
                  value={newCategoryName}
                  placeholder="新分类名字"
                  onChange={(event) => setNewCategoryName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void createCategoryInline();
                  }}
                />
                <Button size="md" disabled={!newCategoryName.trim()} onClick={createCategoryInline}>
                  建好
                </Button>
              </div>
            )}
          </Field>

          <div className="grid grid-cols-[1fr_auto] items-end gap-2">
            <Field label="金额">
              <MoneyInput value={amount} onChange={setAmount} currency={currency} />
            </Field>
            <CurrencyPicker
              value={currency}
              onChange={(next) => {
                setCurrency(next);
                /* 换了币种，原来选中的储蓄就对不上了 */
                if (savingsItem && (savingsItem.currency ?? settings.currency) !== next) {
                  setSavingsItemId("");
                }
              }}
            />
          </div>

          <Field label="从储蓄里出" hint="可选。记完自动扣减，改或删会自动退回">
            <div className="flex flex-wrap gap-1.5">
              <Chip active={!savingsItemId} onClick={() => setSavingsItemId("")}>
                不关联
              </Chip>
              {savingsOptions.map((item) => (
                <Chip
                  key={item.id}
                  active={savingsItemId === item.id}
                  onClick={() => setSavingsItemId(savingsItemId === item.id ? "" : item.id)}
                >
                  <span aria-hidden>{item.emoji ?? (item.kind === "envelope" ? "🐷" : "💰")}</span>
                  {item.name} · {fmtMoney(item.current ?? 0, { currency: item.currency })}
                </Chip>
              ))}
            </div>
            {savingsOptions.length === 0 && (
              <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
                没有同币种的储蓄可选。先到 Ledger → 储蓄里建一个小荷包，或把币种改一致。
              </p>
            )}
            {savingsItem && (
              <p
                className={
                  insufficient
                    ? "mt-2 text-[12.5px] leading-relaxed text-destructive"
                    : "mt-2 text-[12.5px] leading-relaxed text-muted-foreground"
                }
              >
                {savingsItem.name} 现在 {fmtMoney(savingsAvailable, { currency: savingsItem.currency })}
                {amount !== undefined && amount > 0
                  ? ` → 记完还剩 ${fmtMoney(Math.max(0, savingsAvailable - amount), {
                      currency: savingsItem.currency,
                    })}`
                  : ""}
              </p>
            )}
          </Field>

          <Field label="日期">
            <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </Field>

          <Field label="细分" hint={suggestions.length ? "点一下就能用" : "可以不填"}>
            <Input
              value={tag}
              placeholder="例如：妈妈买的 / 自己买的"
              onChange={(event) => setTag(event.target.value)}
            />
            {suggestions.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {suggestions.map((item) => (
                  <Chip
                    key={item}
                    active={tag === item}
                    onClick={() => setTag(tag === item ? "" : item)}
                  >
                    {item}
                  </Chip>
                ))}
              </div>
            )}
          </Field>

          <Field label="备注">
            <Textarea
              value={note}
              placeholder="想起来的时候写一句"
              onChange={(event) => setNote(event.target.value)}
            />
          </Field>
        </SheetBody>
        <SheetFooter className="flex items-center gap-2">
          {initial.id && (
            <Button
              variant="destructive"
              size="lg"
              onClick={() =>
                askConfirm({
                  title: "删除这笔开销？",
                  description: "删除后无法恢复。",
                  confirmLabel: "删除",
                  destructive: true,
                  onConfirm: async () => {
                    await deleteSpendEntry(initial.id!);
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
