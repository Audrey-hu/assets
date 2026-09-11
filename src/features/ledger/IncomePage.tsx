import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, SectionHeader } from "@/components/ui/display";
import { Chip } from "@/components/ui/form";
import { useApp } from "@/store/app-store";
import { useEditors, useUI } from "@/store/ui-store";
import { incomeProjectStats, incomeStats } from "@/lib/stats";
import { fmtDate, fmtHours, fmtMoney } from "@/lib/format";
import { INCOME_TYPE } from "@/lib/labels";
import { navigate } from "@/lib/router";
import type { IncomeType } from "@/lib/types";

export function IncomePage() {
  const { data } = useApp();
  const { newIncomeProject } = useEditors();
  const { openModal } = useUI();
  const [filter, setFilter] = useState<IncomeType | "all">("all");

  const projects = useMemo(
    () =>
      [...data.incomes]
        .filter((p) => (filter === "all" ? true : p.type === filter))
        .sort((a, b) => (a.date < b.date ? 1 : -1)),
    [data.incomes, filter],
  );
  const totals = useMemo(() => incomeStats(data.incomes), [data.incomes]);

  return (
    <div className="space-y-8">
      <Card className="grid grid-cols-2 divide-border/70 sm:grid-cols-4 sm:divide-x">
        <Cell label="Revenue" value={fmtMoney(totals.revenue)} />
        <Cell label="Cost" value={fmtMoney(totals.cost)} />
        <Cell label="Net Income" value={fmtMoney(totals.net)} tone />
        <Cell label="Hourly Rate" value={totals.minutes > 0 ? `${fmtMoney(totals.hourly, { decimals: 0 })}/h` : "—"} />
      </Card>

      <section>
        <SectionHeader
          title="项目"
          hint={totals.minutes > 0 ? `累计投入 ${fmtHours(totals.minutes)}` : undefined}
          action={
            <Button
              size="pill"
              variant="ghost"
              className="text-muted-foreground"
              onClick={() => newIncomeProject()}
            >
              <Plus className="size-3.5" />
              新增项目
            </Button>
          }
        />

        <div className="mb-3 flex flex-wrap gap-1.5">
          <Chip active={filter === "all"} onClick={() => setFilter("all")}>
            全部
          </Chip>
          {(Object.keys(INCOME_TYPE) as IncomeType[]).map((key) => (
            <Chip key={key} active={filter === key} onClick={() => setFilter(key)}>
              {INCOME_TYPE[key]}
            </Chip>
          ))}
        </div>

        {projects.length === 0 ? (
          <Card className="px-2 py-2">
            <EmptyState
              icon={<span className="text-[20px]">💡</span>}
              title="还没有记录业余收入。"
              description="下班之后赚到的每一笔，都值得被看见。"
              action={
                <Button size="pill" onClick={() => newIncomeProject()}>
                  Add your first project
                </Button>
              }
            />
          </Card>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {projects.map((project) => {
              const stats = incomeProjectStats(project);
              const asset = data.assets.find((a) => a.id === project.assetId);
              return (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => openModal("income", { initial: project })}
                  className="surface w-full p-5 text-left transition-colors hover:border-primary/25"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-[15.5px] font-medium text-foreground">
                        {project.name}
                      </div>
                      <div className="mt-1 text-[12px] text-muted-foreground">
                        {INCOME_TYPE[project.type]} · {fmtDate(project.date)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="numeral text-[20px] font-medium leading-none text-primary">
                        {fmtMoney(project.revenue)}
                      </div>
                      <div className="mt-1 text-[11.5px] text-muted-foreground">revenue</div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <Mini label="成本" value={fmtMoney(project.cost)} />
                    <Mini label="投入" value={fmtHours(project.minutes)} />
                    <Mini
                      label="时薪"
                      value={project.minutes > 0 ? `${fmtMoney(stats.hourly, { decimals: 0 })}/h` : "—"}
                    />
                  </div>

                  <div className="mt-3.5 flex items-center justify-between border-t border-border/70 pt-3">
                    <span className="text-[12px] text-muted-foreground">
                      Net{" "}
                      <span className="numeral text-foreground">{fmtMoney(stats.net)}</span>
                    </span>
                    {asset && (
                      <span
                        role="link"
                        tabIndex={0}
                        onClick={(event) => {
                          event.stopPropagation();
                          navigate(`#/assets/${asset.id}`);
                        }}
                        className="truncate text-[12px] text-primary"
                      >
                        → {asset.name}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <SectionHeader title="说明" />
        <Card className="p-5 text-[13px] leading-relaxed text-muted-foreground">
          <p>
            <span className="text-foreground">一次性收入</span>：交付一次就结束。
            <br />
            <span className="text-foreground">重复性收入</span>：可以再做一次，但每次都要投入时间。
            <br />
            <span className="text-foreground">可复利收入</span>：做过一次之后，会自己继续产生价值。
          </p>
        </Card>
      </section>
    </div>
  );
}

function Cell({ label, value, tone }: { label: string; value: string; tone?: boolean }) {
  return (
    <div className="border-b border-border/70 p-4 last:border-b-0 sm:border-b-0">
      <div className="label-caps">{label}</div>
      <div
        className={
          tone
            ? "mt-2 numeral text-[24px] font-medium leading-none text-primary"
            : "mt-2 numeral text-[24px] font-medium leading-none text-foreground"
        }
      >
        {value}
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11.5px] text-muted-foreground">{label}</div>
      <div className="mt-1 numeral text-[15px] font-medium text-foreground">{value}</div>
    </div>
  );
}
