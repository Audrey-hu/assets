import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, Progress, SectionHeader } from "@/components/ui/display";
import { Chip } from "@/components/ui/form";
import { Money } from "@/components/ui/money";
import { TrendChart } from "@/components/charts";
import { useApp } from "@/store/app-store";
import { useEditors, useUI } from "@/store/ui-store";
import { monthChange, monthLabel, shiftMonth, spendOverview } from "@/lib/spend-stats";
import { fmtMoney, hasMoney, monthKey, type MoneyMap } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * 开销：只记「我在乎的那几类」，不是逐笔流水账。
 *
 * 和 Journey 里的投入刻意分开：
 *   长期项目里的支出回答"我为这件事投了多少"；
 *   这里回答"我这阵子把钱花在哪了"。
 * 两边各自统计，互不重复计入。
 */
export function SpendingPage() {
  const { data, settings } = useApp();
  const { newSpendEntry, newSpendCategory } = useEditors();
  const { openModal } = useUI();

  const currentMonth = monthKey(new Date());
  const [month, setMonth] = useState(currentMonth);
  const [filter, setFilter] = useState<string>("all");
  const [trendCurrency, setTrendCurrency] = useState<string | undefined>();

  const overview = useMemo(
    () => spendOverview(data.spendCategories, data.spendEntries, { month }),
    [data.spendCategories, data.spendEntries, month],
  );

  const trendCode = trendCurrency ?? overview.currencies[0] ?? settings.currency;
  const trendData = useMemo(
    () =>
      overview.trend.map((point) => ({
        label: point.label,
        value: point.total[trendCode] ?? 0,
      })),
    [overview.trend, trendCode],
  );
  const hasTrend = trendData.some((point) => point.value !== 0);

  const visibleEntries = useMemo(
    () =>
      [...data.spendEntries]
        .filter((entry) => (filter === "all" ? true : entry.categoryId === filter))
        .sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? 1 : -1)),
    [data.spendEntries, filter],
  );

  const grouped = useMemo(() => {
    const groups = new Map<string, typeof visibleEntries>();
    for (const entry of visibleEntries) {
      const key = entry.date.slice(0, 7);
      const list = groups.get(key);
      if (list) list.push(entry);
      else groups.set(key, [entry]);
    }
    return [...groups.entries()];
  }, [visibleEntries]);

  if (data.spendCategories.length === 0) {
    return (
      <Card className="px-2 py-2">
        <EmptyState
          icon={<span className="text-[20px]">🧾</span>}
          title="还没有开销分类。"
          description="先建几个你在乎的类别，比如游戏、衣服、咖啡。之后只需要记这些，不用把每一笔流水都写下来。"
          action={
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button size="pill" onClick={() => newSpendCategory()}>
                新建第一个分类
              </Button>
            </div>
          }
        />
      </Card>
    );
  }

  return (
    <div className="space-y-7">
      {/* ------------------------------ 工具条 ------------------------------ */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 rounded-full border border-border/80 bg-card/70 p-0.5">
          <button
            type="button"
            aria-label="上个月"
            onClick={() => setMonth(shiftMonth(month, -1))}
            className="grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="min-w-[76px] text-center text-[13px] font-medium text-foreground">
            {month.replace("-", " 年 ")} 月
          </span>
          <button
            type="button"
            aria-label="下个月"
            onClick={() => setMonth(shiftMonth(month, 1))}
            className="grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <ChevronRight className="size-4" />
          </button>
          {month !== currentMonth && (
            <Chip className="ml-1" onClick={() => setMonth(currentMonth)}>
              回到本月
            </Chip>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button size="pill" variant="outline" onClick={() => newSpendCategory()}>
            <Plus className="size-3.5" />
            分类
          </Button>
          <Button size="pill" onClick={() => newSpendEntry()}>
            <Plus className="size-3.5" />
            记一笔
          </Button>
        </div>
      </div>

      {/* ------------------------------- 总览 ------------------------------- */}
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <div className="label-caps">{monthLabel(month)}开销</div>
            <Money
              map={overview.total}
              className="mt-2 block text-[34px] font-medium leading-none tracking-[-0.03em] text-foreground"
            />
            <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-muted-foreground">
              <span>{overview.count} 笔</span>
              {hasMoney(overview.total) && overview.daysElapsed > 0 && (
                <>
                  <span className="text-border">·</span>
                  <span>
                    日均 <Money map={overview.daily} className="text-foreground/80" />
                  </span>
                </>
              )}
              {hasMoney(overview.fromSavings) && (
                <>
                  <span className="text-border">·</span>
                  <span>
                    其中 <Money map={overview.fromSavings} className="text-foreground/80" /> 来自储蓄
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="text-right">
            <div className="label-caps">上月</div>
            <Money
              map={overview.previous}
              className="mt-2 block text-[18px] font-medium leading-none text-foreground/85"
              fallback="—"
            />
            <div className="mt-2 text-[12.5px] text-muted-foreground">
              {overview.change === undefined
                ? hasMoney(overview.previous)
                  ? "多币种，不折算"
                  : "上月没有记录"
                : `${overview.change >= 0 ? "多花" : "少花"} ${Math.abs(overview.change * 100).toFixed(0)}%`}
            </div>
          </div>
        </div>

        {overview.categories.some((row) => hasMoney(row.month)) && (
          <div className="mt-5 space-y-3 border-t border-border/70 pt-4">
            {overview.categories
              .filter((row) => hasMoney(row.month))
              .map((row) => (
                <div key={row.category.id} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3 text-[13px]">
                    <span className="flex min-w-0 items-center gap-2">
                      <span aria-hidden>{row.category.emoji ?? "•"}</span>
                      <span className="truncate text-foreground/85">{row.category.name}</span>
                      <span className="shrink-0 text-[11.5px] text-muted-foreground">
                        {row.count} 笔
                      </span>
                    </span>
                    <span className="shrink-0">
                      <Money map={row.month} className="text-foreground/85" />
                      {row.share !== undefined && (
                        <span className="ml-2 text-[11.5px] text-muted-foreground">
                          · {(row.share * 100).toFixed(0)}%
                        </span>
                      )}
                    </span>
                  </div>
                  {row.share !== undefined && <Progress value={row.share * 100} height={4} />}
                </div>
              ))}
          </div>
        )}
      </Card>

      {/* ------------------------------- 趋势 ------------------------------- */}
      <section>
        <SectionHeader
          title="近 6 个月"
          hint="按币种分开看，不折算"
          action={
            overview.currencies.length > 1 ? (
              <div className="flex flex-wrap justify-end gap-1">
                {overview.currencies.map((code) => (
                  <Chip
                    key={code}
                    active={trendCode === code}
                    onClick={() => setTrendCurrency(code)}
                  >
                    {code}
                  </Chip>
                ))}
              </div>
            ) : undefined
          }
        />
        <Card className="p-4">
          {hasTrend ? (
            <TrendChart
              data={trendData}
              color="#3F5F4E"
              formatter={(value) => fmtMoney(value, { currency: trendCode, compact: true })}
              yWidth={54}
            />
          ) : (
            <div className="grid h-[168px] place-items-center text-[13px] text-muted-foreground">
              记几笔之后，这里会显示近 6 个月的花费趋势。
            </div>
          )}
        </Card>
      </section>

      {/* ------------------------------- 分类 ------------------------------- */}
      <section>
        <SectionHeader title="分类" hint={`${data.spendCategories.length} 类`} />
        <div className="grid gap-3 lg:grid-cols-2">
          {overview.categories.map((row) => {
            const change = monthChange(row.month, row.previous);
            const budgetUsed = row.budgetUsed;
            return (
              <Card key={row.category.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span aria-hidden className="text-[18px]">
                        {row.category.emoji ?? "•"}
                      </span>
                      <span className="truncate text-[15px] font-medium text-foreground">
                        {row.category.name}
                      </span>
                    </div>
                    <div className="mt-1 text-[12px] text-muted-foreground">
                      {row.count} 笔 · 共 {row.totalCount} 笔
                    </div>
                  </div>
                  <Button
                    size="iconSm"
                    variant="ghost"
                    aria-label="编辑分类"
                    onClick={() => openModal("spendCategory", { initial: row.category })}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-[11.5px] text-muted-foreground">{monthLabel(month)}</div>
                    <Money
                      map={row.month}
                      className="mt-1 block text-[19px] font-medium text-foreground"
                    />
                  </div>
                  <div>
                    <div className="text-[11.5px] text-muted-foreground">上月</div>
                    <Money
                      map={row.previous}
                      className="mt-1 block text-[19px] font-medium text-muted-foreground"
                    />
                    {change !== undefined && (
                      <div
                        className={cn(
                          "mt-1 text-[11.5px]",
                          change > 0 ? "text-[#A9765A]" : "text-primary",
                        )}
                      >
                        {change >= 0 ? "↑" : "↓"} {Math.abs(change * 100).toFixed(0)}%
                      </div>
                    )}
                  </div>
                </div>

                {budgetUsed !== undefined && (
                  <div className="mt-4 space-y-1.5">
                    <div className="flex items-center justify-between text-[11.5px] text-muted-foreground">
                      <span>
                        预算 {fmtMoney(row.category.monthlyBudget ?? 0, {
                          currency: row.category.budgetCurrency,
                        })}
                      </span>
                      <span>
                        {budgetUsed > 1
                          ? `超了 ${fmtMoney(
                              (budgetUsed - 1) * (row.category.monthlyBudget ?? 0),
                              { currency: row.category.budgetCurrency },
                            )}`
                          : `还剩 ${fmtMoney(
                              (1 - budgetUsed) * (row.category.monthlyBudget ?? 0),
                              { currency: row.category.budgetCurrency },
                            )}`}
                      </span>
                    </div>
                    <Progress
                      value={Math.min(100, budgetUsed * 100)}
                      height={5}
                      tone={budgetUsed > 1 ? "clay" : "sage"}
                    />
                  </div>
                )}

                {row.tags.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {row.tags.map((tag) => (
                      <span
                        key={tag.tag}
                        className="rounded-full bg-secondary/80 px-2 py-0.5 text-[11.5px] text-muted-foreground"
                      >
                        {tag.tag} · <Money map={tag.month} className="text-foreground/70" />
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-4 border-t border-border/70 pt-3">
                  <Button
                    size="pill"
                    variant="outline"
                    onClick={() => newSpendEntry({ categoryId: row.category.id })}
                  >
                    <Plus className="size-3.5" />
                    记一笔
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* ------------------------------- 记录 ------------------------------- */}
      <section>
        <SectionHeader
          title="记录"
          hint={filter === "all" ? `${visibleEntries.length} 笔` : undefined}
          action={
            <Button size="pill" variant="ghost" className="text-muted-foreground" onClick={() => newSpendEntry()}>
              <Plus className="size-3.5" />
              记一笔
            </Button>
          }
        />

        <div className="mb-3 flex flex-wrap gap-1.5">
          <Chip active={filter === "all"} onClick={() => setFilter("all")}>
            全部
          </Chip>
          {overview.categories.map((row) => (
            <Chip
              key={row.category.id}
              active={filter === row.category.id}
              onClick={() => setFilter(filter === row.category.id ? "all" : row.category.id)}
            >
              <span aria-hidden>{row.category.emoji ?? "•"}</span>
              {row.category.name}
            </Chip>
          ))}
        </div>

        {visibleEntries.length === 0 ? (
          <Card className="px-2 py-2">
            <EmptyState
              icon={<span className="text-[20px]">📝</span>}
              title="还没有记录。"
              description="想起来的时候记一笔就好，不用每笔都记。"
              action={
                <Button size="pill" onClick={() => newSpendEntry()}>
                  记第一笔
                </Button>
              }
            />
          </Card>
        ) : (
          <div className="space-y-5">
            {grouped.map(([key, entries]) => (
              <div key={key}>
                <div className="label-caps mb-2 px-1">
                  {key.replace("-", " 年 ")} 月
                </div>
                <Card className="row-divide overflow-hidden">
                  {entries.map((entry) => {
                    const category = data.spendCategories.find(
                      (item) => item.id === entry.categoryId,
                    );
                    return (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => openModal("spendEntry", { initial: entry })}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/40"
                      >
                        <span className="w-[44px] shrink-0 text-[12px] text-muted-foreground numeral">
                          {entry.date.slice(5).replace("-", ".")}
                        </span>
                        <span aria-hidden className="shrink-0 text-[16px]">
                          {category?.emoji ?? "•"}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px] font-medium text-foreground">
                            {category?.name ?? "（分类已删除）"}
                            {entry.tag && (
                              <span className="ml-2 rounded-full bg-secondary px-1.5 py-0.5 text-[11px] font-normal text-muted-foreground">
                                {entry.tag}
                              </span>
                            )}
                            {entry.savingsItemId && (
                              <span className="ml-2 rounded-full bg-accent px-1.5 py-0.5 text-[11px] font-normal text-accent-foreground">
                                {data.savings.find((item) => item.id === entry.savingsItemId)?.name ??
                                  "储蓄"}
                              </span>
                            )}
                          </span>
                          {entry.note && (
                            <span className="mt-0.5 block truncate text-[12px] text-muted-foreground">
                              {entry.note}
                            </span>
                          )}
                        </span>
                        <span className="shrink-0 numeral text-[14px] font-medium text-foreground">
                          {fmtMoney(entry.amount, { currency: entry.currency })}
                        </span>
                      </button>
                    );
                  })}
                </Card>
              </div>
            ))}
          </div>
        )}
      </section>

      {overview.orphanCount > 0 && (
        <p className="text-[12px] leading-relaxed text-muted-foreground">
          有 {overview.orphanCount} 笔记录的分类已经被删掉了，它们仍会计入总额。
        </p>
      )}

      <p className="text-[12px] leading-relaxed text-muted-foreground">
        这里的开销和 Journey 里的「投入」是两套账：一个看生活花销，一个看长期项目投入，
        互不重复计入。不同币种分开统计，不做汇率折算。
      </p>
    </div>
  );
}

/** 供测试与其他页面复用的类型出口 */
export type SpendingMoneyMap = MoneyMap;
