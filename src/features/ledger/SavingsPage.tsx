import { useMemo } from "react";
import { Check, Lock, Plus, Shield, Waves } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, Meter, Progress, SectionHeader } from "@/components/ui/display";
import { TrendChart } from "@/components/charts";
import { useApp } from "@/store/app-store";
import { useEditors, useUI } from "@/store/ui-store";
import {
  SAVINGS_MILESTONES,
  envelopeMonths,
  expectedInterest,
  maturityList,
  savingTxFor,
  savingsSeries,
  savingsTotals,
} from "@/lib/stats";
import { fmtDate, fmtMoney } from "@/lib/format";
import { differenceInCalendarDays } from "date-fns";
import type { SavingsItem } from "@/lib/types";

export function SavingsPage() {
  const { data, settings } = useApp();
  const { openModal } = useUI();
  const { newSavings, newSavingsTx } = useEditors();

  const totals = useMemo(() => savingsTotals(data.savings), [data.savings]);
  const deposits = useMemo(() => data.savings.filter((s) => s.kind === "deposit"), [data.savings]);
  const maturities = useMemo(() => maturityList(data.savings), [data.savings]);
  const series = useMemo(
    () =>
      savingsSeries(data.snapshots, totals.total).map((row) => ({
        label: row.label,
        value: row.total,
      })),
    [data.snapshots, totals.total],
  );
  const nextMilestone = SAVINGS_MILESTONES.find((m) => m > totals.total);
  const currency = settings.currency;

  return (
    <div className="space-y-8">
      <Card className="p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="label-caps">Total Savings</div>
            <div className="mt-2 numeral text-[38px] font-medium leading-none tracking-[-0.03em] text-foreground">
              {fmtMoney(totals.total, { currency })}
            </div>
          </div>
          <div className="flex gap-6">
            <div>
              <div className="label-caps">Available</div>
              <div className="mt-2 numeral text-[18px] font-medium text-foreground">
                {fmtMoney(totals.available, { currency })}
              </div>
            </div>
            <div>
              <div className="label-caps">Locked</div>
              <div className="mt-2 numeral text-[18px] font-medium text-foreground">
                {fmtMoney(totals.locked, { currency })}
              </div>
            </div>
            <div>
              <div className="label-caps">Liquidity</div>
              <div className="mt-2 numeral text-[18px] font-medium text-primary">
                {Math.round(totals.liquidity * 100)}%
              </div>
            </div>
          </div>
        </div>
        {totals.envelopeTotal > 0 && (
          <p className="mt-3 text-[12.5px] text-muted-foreground">
            可用金额里含小荷包{" "}
            <span className="numeral text-foreground/80">
              {fmtMoney(totals.envelopeTotal, { currency })}
            </span>
          </p>
        )}
      </Card>

      {/* reservoir */}
      <section>
        <SectionHeader title="蓄水池" hint="覆盖必要开支的缓冲" />
        <div className="grid gap-3 lg:grid-cols-2">
          {totals.reservoir ? (
            <Card className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Waves className="size-4" />
                  </span>
                  <div>
                    <div className="text-[15px] font-medium text-foreground">{totals.reservoir.name}</div>
                    <div className="text-[12px] text-muted-foreground">
                      目标 {fmtMoney(totals.reservoir.target ?? 0, { currency })}
                    </div>
                  </div>
                </div>
                <Button
                  size="pill"
                  variant="ghost"
                  className="text-muted-foreground"
                  onClick={() => openModal("savings", { initial: totals.reservoir })}
                >
                  编辑
                </Button>
              </div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="numeral text-[30px] font-medium leading-none text-foreground">
                  {fmtMoney(totals.reservoir.current ?? 0, { currency })}
                </span>
                <span className="text-[13px] text-muted-foreground">
                  / {fmtMoney(totals.reservoir.target ?? 0, { currency })}
                </span>
              </div>
              <div className="mt-4">
                <Meter
                  value={totals.reservoir.current ?? 0}
                  target={totals.reservoir.target ?? 1}
                  tone="sage"
                  showLabels={false}
                />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-md bg-secondary/50 px-3 py-2.5">
                  <div className="label-caps">Safety Runway</div>
                  <div className="mt-1.5 numeral text-[18px] font-medium text-foreground">
                    {totals.runwayMonths.toFixed(1)} months
                  </div>
                </div>
                <div className="rounded-md bg-secondary/50 px-3 py-2.5">
                  <div className="label-caps">每月必要开支</div>
                  <div className="mt-1.5 numeral text-[18px] font-medium text-foreground">
                    {fmtMoney(totals.reservoir.monthlyEssential ?? 0, { currency })}
                  </div>
                </div>
              </div>
              {(totals.reservoir.current ?? 0) < (totals.reservoir.target ?? 0) && (
                <p className="mt-3 text-[12.5px] text-muted-foreground">
                  Gap to target{" "}
                  <span className="numeral text-foreground">
                    {fmtMoney((totals.reservoir.target ?? 0) - (totals.reservoir.current ?? 0), { currency })}
                  </span>
                </p>
              )}
            </Card>
          ) : (
            <Card className="flex flex-col items-start gap-3 p-5">
              <p className="text-[13px] text-muted-foreground">还没有设置蓄水池。</p>
              <Button size="pill" onClick={() => newSavings({ initial: { kind: "reservoir", name: "蓄水池" } })}>
                设置蓄水池
              </Button>
            </Card>
          )}

          {totals.emergency ? (
            <EmergencyCard item={totals.emergency} currency={currency} />
          ) : (
            <Card className="flex flex-col items-start gap-3 p-5">
              <p className="text-[13px] text-muted-foreground">还没有设置备用金。</p>
              <Button size="pill" onClick={() => newSavings({ initial: { kind: "emergency", name: "备用金" } })}>
                设置备用金
              </Button>
            </Card>
          )}
        </div>
      </section>

      {/* 小荷包：为某件具体的事单独存钱 */}
      <section>
        <SectionHeader
          title="小荷包"
          hint={
            totals.envelopes.length
              ? `合计 ${fmtMoney(totals.envelopeTotal, { currency })}`
              : "为某件具体的事单独存钱"
          }
          action={
            <Button
              size="pill"
              variant="ghost"
              className="text-muted-foreground"
              onClick={() =>
                newSavings({ initial: { kind: "envelope", name: "新的小荷包", emoji: "🐷" } })
              }
            >
              <Plus className="size-3.5" />
              新建
            </Button>
          }
        />
        {totals.envelopes.length === 0 ? (
          <Card className="px-5 py-6 text-center text-[13px] leading-relaxed text-muted-foreground">
            还没有小荷包。会员费、出去玩、想买的东西，都可以单独存一笔
            <br />
            <button
              type="button"
              onClick={() =>
                newSavings({ initial: { kind: "envelope", name: "新的小荷包", emoji: "🐷" } })
              }
              className="mt-2 text-primary underline-offset-4 hover:underline"
            >
              新建一个小荷包 →
            </button>
          </Card>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {totals.envelopes.map((envelope) => {
              const current = envelope.current ?? 0;
              const target = envelope.target ?? 0;
              const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0;
              const months = envelopeMonths(envelope);
              const done = target > 0 && current >= target;
              return (
                <Card key={envelope.id} className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-border/70 bg-secondary/50 text-[19px]">
                        {envelope.emoji ?? "🐷"}
                      </span>
                      <div className="min-w-0">
                        <div className="truncate text-[15px] font-medium text-foreground">
                          {envelope.name}
                        </div>
                        <div className="text-[12px] text-muted-foreground">
                          {target > 0 ? `目标 ${fmtMoney(target, { currency })}` : "没有设目标"}
                          {envelope.dueDate ? ` · ${fmtDate(envelope.dueDate)} 前` : ""}
                        </div>
                      </div>
                    </div>
                    <Button
                      size="pill"
                      variant="ghost"
                      className="text-muted-foreground"
                      onClick={() => openModal("savings", { initial: envelope })}
                    >
                      编辑
                    </Button>
                  </div>

                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="numeral text-[26px] font-medium leading-none text-foreground">
                      {fmtMoney(current, { currency })}
                    </span>
                    {target > 0 && (
                      <span className="numeral text-[13px] text-muted-foreground">
                        / {fmtMoney(target, { currency })}
                      </span>
                    )}
                  </div>

                  {target > 0 && (
                    <div className="mt-3 space-y-2">
                      <Progress value={pct} tone="sand" height={6} />
                      <div className="flex items-center justify-between text-[12px] text-muted-foreground">
                        <span className="numeral">{Math.round(pct)}%</span>
                        <span>
                          {done
                            ? "已存够"
                            : months !== undefined
                              ? `按每月 ${fmtMoney(envelope.monthlyPlan ?? 0, { currency })}，还需 ${months} 个月`
                              : `还差 ${fmtMoney(target - current, { currency })}`}
                        </span>
                      </div>
                    </div>
                  )}

                  <Button
                    size="pill"
                    variant="outline"
                    className="mt-4"
                    onClick={() => newSavingsTx({ itemId: envelope.id })}
                  >
                    <Plus className="size-3.5" />
                    记录变动
                  </Button>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* deposits */}
      <section>
        <SectionHeader
          title="定期存款"
          hint={deposits.length ? `${deposits.length} 笔` : undefined}
          action={
            <Button
              size="pill"
              variant="ghost"
              className="text-muted-foreground"
              onClick={() => newSavings({ initial: { kind: "deposit", name: "定期存款" } })}
            >
              <Plus className="size-3.5" />
              新增存单
            </Button>
          }
        />
        {deposits.length === 0 ? (
          <Card className="px-5 py-6 text-center text-[13px] text-muted-foreground">
            还没有定期存款。每一笔存单都可以单独记录到期日与预期利息。
          </Card>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {deposits.map((deposit) => (
              <DepositCard key={deposit.id} item={deposit} currency={currency} />
            ))}
          </div>
        )}
      </section>

      {/* maturity timeline */}
      {maturities.length > 0 && (
        <section>
          <SectionHeader title="Maturity Timeline" hint="未来几年的到期节奏" />
          <Card className="p-5">
            <div className="relative pl-5">
              <span className="absolute bottom-2 left-[5px] top-2 w-px bg-border" />
              {maturities.map((item) => {
                const days = item.maturityDate
                  ? differenceInCalendarDays(new Date(item.maturityDate), new Date())
                  : 0;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => openModal("savings", { initial: item })}
                    className="relative flex w-full items-center gap-4 py-2.5 text-left"
                  >
                    <span className="absolute -left-5 grid size-[11px] place-items-center rounded-full border-2 border-background bg-primary/70" />
                    <span className="w-[86px] shrink-0 text-[12.5px] text-muted-foreground numeral">
                      {item.maturityDate ? fmtDate(item.maturityDate).slice(0, 7).replace(".", " / ") : "—"}
                    </span>
                    <span className="flex-1 text-[14px] text-foreground">
                      {fmtMoney(item.principal ?? 0, { currency })}
                      <span className="ml-2 text-[12px] text-muted-foreground">{item.bank}</span>
                    </span>
                    <span className="numeral shrink-0 text-[12px] text-muted-foreground">
                      {days > 0 ? `${days} 天` : "已到期"}
                    </span>
                  </button>
                );
              })}
            </div>
          </Card>
        </section>
      )}

      {/* growth */}
      <section>
        <SectionHeader title="储蓄增长" hint="每月快照" />
        <Card className="p-4 pt-5">
          <TrendChart
            data={series}
            color="#3F5F4E"
            formatter={(value) => `${Math.round(value / 1000)}k`}
            yWidth={38}
          />
        </Card>
        <div className="mt-3 flex flex-wrap gap-2">
          {SAVINGS_MILESTONES.map((milestone) => {
            const achieved = totals.total >= milestone;
            return (
              <span
                key={milestone}
                className={
                  achieved
                    ? "inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-[12.5px] text-accent-foreground"
                    : "inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-[12.5px] text-muted-foreground"
                }
              >
                {achieved && <Check className="size-3.5" />}
                {milestone >= 10000 ? `${milestone / 10000}万` : milestone}
              </span>
            );
          })}
        </div>
        {nextMilestone && (
          <div className="mt-4">
            <div className="flex items-baseline justify-between text-[12.5px] text-muted-foreground">
              <span>距离 {nextMilestone / 10000} 万</span>
              <span className="numeral">
                {fmtMoney(nextMilestone - totals.total, { currency })} to go
              </span>
            </div>
            <div className="mt-2">
              <Progress value={(totals.total / nextMilestone) * 100} height={5} />
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function EmergencyCard({
  item,
  currency,
}: {
  item: SavingsItem;
  currency: string;
}) {
  const { data } = useApp();
  const { openModal } = useUI();
  const { newSavingsTx } = useEditors();
  const txs = useMemo(() => savingTxFor(item.id, data.savingsTx).slice(0, 4), [item.id, data.savingsTx]);
  const pct = item.target ? Math.min(100, ((item.current ?? 0) / item.target) * 100) : 0;

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-lg bg-[#6B7C90]/12 text-[#5A6B7E]">
            <Shield className="size-4" />
          </span>
          <div>
            <div className="text-[15px] font-medium text-foreground">{item.name}</div>
            <div className="text-[12px] text-muted-foreground">
              Target {fmtMoney(item.target ?? 0, { currency })}
            </div>
          </div>
        </div>
        <Button
          size="pill"
          variant="ghost"
          className="text-muted-foreground"
          onClick={() => openModal("savings", { initial: item })}
        >
          编辑
        </Button>
      </div>
      <div className="mt-4 flex items-baseline gap-2">
        <span className="numeral text-[30px] font-medium leading-none text-foreground">
          {fmtMoney(item.current ?? 0, { currency })}
        </span>
        <span className="text-[13px] text-muted-foreground">{Math.round(pct)}%</span>
      </div>
      <div className="mt-4">
        <Progress value={pct} tone="steel" height={7} />
      </div>
      <Button
        size="pill"
        variant="outline"
        className="mt-4"
        onClick={() => newSavingsTx({ itemId: item.id })}
      >
        <Plus className="size-3.5" />
        记录变动
      </Button>
      {txs.length > 0 && (
        <div className="mt-4 divide-y divide-border/70 border-t border-border/70 pt-1">
          {txs.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between gap-3 py-2">
              <span className="min-w-0">
                <span className="block truncate text-[13px] text-foreground">{tx.reason}</span>
                <span className="text-[11.5px] text-muted-foreground numeral">{fmtDate(tx.date)}</span>
              </span>
              <span
                className={
                  tx.amount >= 0
                    ? "numeral shrink-0 text-[13.5px] font-medium text-primary"
                    : "numeral shrink-0 text-[13.5px] font-medium text-foreground/75"
                }
              >
                {tx.amount >= 0 ? "+" : "−"}
                {fmtMoney(Math.abs(tx.amount), { currency })}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function DepositCard({ item, currency }: { item: SavingsItem; currency: string }) {
  const { openModal } = useUI();
  const days = item.maturityDate
    ? differenceInCalendarDays(new Date(item.maturityDate), new Date())
    : 0;
  const progress =
    item.depositDate && item.maturityDate
      ? Math.min(
          100,
          Math.max(
            0,
            (differenceInCalendarDays(new Date(), new Date(item.depositDate)) /
              Math.max(
                1,
                differenceInCalendarDays(new Date(item.maturityDate), new Date(item.depositDate)),
              )) *
              100,
          ),
        )
      : 0;

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-lg bg-[#C7B396]/22 text-[#8F7A57]">
            <Lock className="size-4" />
          </span>
          <div>
            <div className="text-[15px] font-medium text-foreground">{item.name}</div>
            <div className="text-[12px] text-muted-foreground">
              {item.bank} · {item.rate ?? 0}% · {item.termMonths ?? 0} 个月
            </div>
          </div>
        </div>
        <Button
          size="pill"
          variant="ghost"
          className="text-muted-foreground"
          onClick={() => openModal("savings", { initial: item })}
        >
          编辑
        </Button>
      </div>

      <div className="mt-4 flex items-end justify-between gap-4">
        <div>
          <div className="numeral text-[26px] font-medium leading-none text-foreground">
            {fmtMoney(item.principal ?? 0, { currency })}
          </div>
          <div className="mt-1.5 text-[12px] text-muted-foreground">
            预期利息 {fmtMoney(expectedInterest(item), { currency })}
          </div>
        </div>
        <div className="text-right">
          <div className="label-caps">Remaining</div>
          <div className="mt-1.5 numeral text-[15px] text-foreground">
            {days > 0 ? `${days} 天` : "已到期"}
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <Progress value={progress} tone="sand" height={5} />
        <div className="flex items-center justify-between text-[11.5px] text-muted-foreground">
          <span className="numeral">{item.depositDate ? fmtDate(item.depositDate) : "—"}</span>
          <span className="numeral">{item.maturityDate ? fmtDate(item.maturityDate) : "—"}</span>
        </div>
      </div>

      {item.autoRenew && (
        <p className="mt-3 text-[12px] text-muted-foreground">到期自动转存</p>
      )}
      {item.note && <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">{item.note}</p>}
    </Card>
  );
}
