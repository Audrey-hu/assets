import { useMemo, useState } from "react";
import { Pencil, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, Progress, SectionHeader } from "@/components/ui/display";
import { Chip } from "@/components/ui/form";
import { useApp } from "@/store/app-store";
import { useEditors, useUI } from "@/store/ui-store";
import { investmentStats } from "@/lib/stats";
import { fmtDate, fmtMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * 理财：黄金、基金、股票、数字货币……
 * 只记「投了多少本金」和「现在值多少」，中间的涨跌不用逐笔记账。
 */
export function InvestingPage() {
  const { data } = useApp();
  const { newInvestment } = useEditors();
  const { openModal } = useUI();
  const [filter, setFilter] = useState<string>("all");

  const items = useMemo(
    () =>
      [...data.investments]
        .filter((item) => (filter === "all" ? true : item.category === filter))
        .sort((a, b) => (a.startDate < b.startDate ? 1 : -1)),
    [data.investments, filter],
  );
  const totals = useMemo(() => investmentStats(data.investments), [data.investments]);

  if (data.investments.length === 0) {
    return (
      <Card className="px-2 py-2">
        <EmptyState
          icon={<span className="text-[20px]">📈</span>}
          title="还没有记录投资。"
          description="黄金、基金、股票、数字货币都可以放进来。类别你自己定，随时能改。"
          action={
            <Button size="pill" onClick={() => newInvestment()}>
              添加第一笔投资
            </Button>
          }
        />
      </Card>
    );
  }

  return (
    <div className="space-y-7">
      <Card className="p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="label-caps">当前市值</div>
            <div className="mt-2 numeral text-[34px] font-medium leading-none tracking-[-0.03em] text-foreground">
              {fmtMoney(totals.value)}
            </div>
            <div className="mt-2.5 text-[12.5px] text-muted-foreground">
              投入本金 <span className="numeral text-foreground/80">{fmtMoney(totals.cost)}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="label-caps">盈亏</div>
            <div
              className={cn(
                "mt-2 numeral text-[22px] font-medium leading-none",
                totals.pnl >= 0 ? "text-primary" : "text-[#A9765A]",
              )}
            >
              {totals.pnl >= 0 ? "+" : "−"}
              {fmtMoney(Math.abs(totals.pnl))}
            </div>
            <div className="mt-2 numeral text-[13px] text-muted-foreground">
              {(totals.roi * 100).toFixed(1)}%
            </div>
          </div>
        </div>

        {totals.byCategory.length > 0 && (
          <div className="mt-5 space-y-3 border-t border-border/70 pt-4">
            {totals.byCategory.map((row) => (
              <div key={row.category} className="space-y-1.5">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-foreground/85">{row.category}</span>
                  <span className="numeral text-muted-foreground">
                    {fmtMoney(row.value)}
                    <span className="ml-2 text-[12px]">
                      {row.pnl >= 0 ? "+" : "−"}
                      {fmtMoney(Math.abs(row.pnl))}
                    </span>
                  </span>
                </div>
                <Progress value={row.share * 100} height={4} />
              </div>
            ))}
          </div>
        )}

        {totals.missing > 0 && (
          <p className="mt-4 text-[12px] leading-relaxed text-muted-foreground">
            有 {totals.missing} 笔还没更新过市值，暂时按本金计入总额。
          </p>
        )}
      </Card>

      <section>
        <SectionHeader
          title="持仓"
          hint={`${data.investments.length} 笔`}
          action={
            <Button
              size="pill"
              variant="ghost"
              className="text-muted-foreground"
              onClick={() => newInvestment()}
            >
              <Plus className="size-3.5" />
              新增
            </Button>
          }
        />

        <div className="mb-3 flex flex-wrap gap-1.5">
          <Chip active={filter === "all"} onClick={() => setFilter("all")}>
            全部
          </Chip>
          {totals.byCategory.map((row) => (
            <Chip
              key={row.category}
              active={filter === row.category}
              onClick={() => setFilter(row.category)}
            >
              {row.category}
            </Chip>
          ))}
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          {items.map((item) => {
            const current = item.value ?? item.cost;
            const pnl = current - item.cost;
            const roi = item.cost > 0 ? pnl / item.cost : 0;
            return (
              <Card key={item.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-[15px] font-medium text-foreground">{item.name}</div>
                    <div className="mt-1 flex items-center gap-2 text-[12px] text-muted-foreground">
                      <span className="rounded-full bg-secondary px-2 py-0.5">{item.category}</span>
                      <span>{fmtDate(item.startDate)}</span>
                    </div>
                  </div>
                  <Button
                    size="iconSm"
                    variant="ghost"
                    aria-label="编辑"
                    onClick={() => openModal("investment", { initial: item })}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3">
                  <div>
                    <div className="text-[11.5px] text-muted-foreground">本金</div>
                    <div className="mt-1 numeral text-[15px] font-medium text-foreground">
                      {fmtMoney(item.cost)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11.5px] text-muted-foreground">市值</div>
                    <div className="mt-1 numeral text-[15px] font-medium text-foreground">
                      {item.value === undefined ? "—" : fmtMoney(item.value)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11.5px] text-muted-foreground">盈亏</div>
                    <div
                      className={cn(
                        "mt-1 numeral text-[15px] font-medium",
                        pnl >= 0 ? "text-primary" : "text-[#A9765A]",
                      )}
                    >
                      {item.value === undefined
                        ? "—"
                        : `${pnl >= 0 ? "+" : "−"}${Math.abs(roi * 100).toFixed(1)}%`}
                    </div>
                  </div>
                </div>

                {item.note && (
                  <p className="mt-3 text-[12.5px] leading-relaxed text-muted-foreground">{item.note}</p>
                )}

                <div className="mt-4 flex items-center justify-between border-t border-border/70 pt-3">
                  <span className="text-[11.5px] text-muted-foreground">
                    {item.valueUpdatedAt
                      ? `市值更新于 ${fmtDate(item.valueUpdatedAt.slice(0, 10))}`
                      : "还没更新过市值"}
                  </span>
                  <Button
                    size="pill"
                    variant="outline"
                    onClick={() => openModal("investment", { initial: item })}
                  >
                    <RefreshCw className="size-3.5" />
                    更新市值
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      <p className="text-[12px] leading-relaxed text-muted-foreground">
        这里只记本金和当前市值，不逐笔记录涨跌。想细分就在类别里自己起名字，
        比如「黄金」「红利基金」「比特币」——用过的类别会留在编辑器的快捷选项里。
      </p>
    </div>
  );
}
