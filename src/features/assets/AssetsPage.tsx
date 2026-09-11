import { useMemo, useState } from "react";
import { ArrowDown, Plus } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, SectionHeader, Segmented } from "@/components/ui/display";
import { Chip } from "@/components/ui/form";
import { PhotoGrid } from "@/components/PhotoGrid";
import { useApp } from "@/store/app-store";
import { useEditors, useUI } from "@/store/ui-store";
import { fmtDate, fmtHours, fmtMoney, monthKey } from "@/lib/format";
import { ASSET_TYPE, ASSET_TYPE_ORDER } from "@/lib/labels";
import { navigate } from "@/lib/router";
import type { Asset, AssetType } from "@/lib/types";

type Tab = "all" | "chain";

export function AssetsPage() {
  const { data } = useApp();
  const { newAsset } = useEditors();
  const [tab, setTab] = useState<Tab>("all");
  const [filter, setFilter] = useState<AssetType | "all">("all");

  const assets = useMemo(
    () =>
      [...data.assets]
        .filter((a) => (filter === "all" ? true : a.type === filter))
        .sort((a, b) => (a.createdDate < b.createdDate ? 1 : -1)),
    [data.assets, filter],
  );

  const totals = useMemo(
    () => ({
      count: data.assets.length,
      minutes: data.assets.reduce((acc, a) => acc + a.minutes, 0),
      cost: data.assets.reduce((acc, a) => acc + a.cost, 0),
      income: data.assets.reduce((acc, a) => acc + a.incomeGenerated, 0),
      thisMonth: data.assets.filter((a) => a.createdDate.startsWith(monthKey(new Date()))).length,
    }),
    [data.assets],
  );

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow="沉淀"
        title="Assets"
        subtitle="时间和钱最终留下来的东西"
        actions={
          <Button size="icon" variant="outline" aria-label="新增资产" className="rounded-full" onClick={() => newAsset()}>
            <Plus className="size-4" />
          </Button>
        }
      />

      {data.assets.length === 0 ? (
        <Card className="mt-2 px-2 py-2">
          <EmptyState
            icon={<span className="text-[20px]">🗂️</span>}
            title="你投入的时间，最终会留下东西。"
            description="技能、作品、文章、关系、客户，都可以成为资产。"
            action={
              <Button size="pill" onClick={() => newAsset()}>
                Add Your First Asset
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          <div className="pb-5 pt-4 lg:pt-0">
            <Segmented
              value={tab}
              onChange={setTab}
              options={[
                { value: "all", label: "全部资产" },
                { value: "chain", label: "From Investment to Asset" },
              ]}
              className="max-w-md"
            />
          </div>

          <Card className="grid grid-cols-2 divide-border/70 sm:grid-cols-4 sm:divide-x">
            <Cell label="资产数量" value={String(totals.count)} />
            <Cell label="投入时间" value={fmtHours(totals.minutes)} />
            <Cell label="投入成本" value={fmtMoney(totals.cost, { compact: true })} />
            <Cell label="带来收入" value={fmtMoney(totals.income, { compact: true })} tone />
          </Card>

          {tab === "all" ? (
            <section className="pt-7">
              <div className="mb-3 flex flex-wrap gap-1.5">
                <Chip active={filter === "all"} onClick={() => setFilter("all")}>
                  全部
                </Chip>
                {ASSET_TYPE_ORDER.filter((type) =>
                  data.assets.some((a) => a.type === type),
                ).map((type) => (
                  <Chip key={type} active={filter === type} onClick={() => setFilter(type)}>
                    {ASSET_TYPE[type]}
                  </Chip>
                ))}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {assets.map((asset) => (
                  <AssetCard key={asset.id} asset={asset} />
                ))}
              </div>
            </section>
          ) : (
            <section className="pt-7">
              <SectionHeader
                title="From Investment to Asset"
                hint="时间 + 钱 → 学到的 → 做出的 → 留下来的 → 又变成收入"
              />
              <div className="space-y-3">
                {data.assets
                  .filter((a) => a.sourceHobbyId || a.sourceJourneyId || a.sourceIncomeId)
                  .slice(0, 8)
                  .map((asset) => (
                    <AssetChain key={asset.id} asset={asset} />
                  ))}
                {data.assets.filter((a) => a.sourceHobbyId || a.sourceJourneyId || a.sourceIncomeId)
                  .length === 0 && (
                  <Card className="px-5 py-6 text-center text-[13px] text-muted-foreground">
                    给资产关联来源之后，这里会画出投入变成资产的路径。
                  </Card>
                )}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

export function AssetCard({ asset }: { asset: Asset }) {
  return (
    <button
      type="button"
      onClick={() => navigate(`#/assets/${asset.id}`)}
      className="surface w-full p-5 text-left transition-colors hover:border-primary/25"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-[15.5px] font-medium text-foreground">{asset.name}</div>
          <div className="mt-1 text-[12px] text-muted-foreground">
            {ASSET_TYPE[asset.type]} · {fmtDate(asset.createdDate)}
          </div>
        </div>
        {asset.photoIds.length > 0 && (
          <PhotoGrid ids={asset.photoIds.slice(0, 1)} columns={1} className="w-12 shrink-0" />
        )}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3">
        <Mini label="投入" value={fmtHours(asset.minutes)} />
        <Mini label="成本" value={fmtMoney(asset.cost, { compact: true })} />
        <Mini
          label="带来收入"
          value={fmtMoney(asset.incomeGenerated, { compact: true })}
          tone={asset.incomeGenerated > 0}
        />
      </div>
      {asset.note && (
        <p className="mt-3 line-clamp-2 text-[12.5px] leading-relaxed text-muted-foreground">{asset.note}</p>
      )}
    </button>
  );
}

function AssetChain({ asset }: { asset: Asset }) {
  const { data } = useApp();
  const hobby = data.hobbies.find((h) => h.id === asset.sourceHobbyId);
  const journey = data.journeys.find((j) => j.id === asset.sourceJourneyId);
  const income = data.incomes.find((i) => i.id === asset.sourceIncomeId);

  const steps: { label: string; value?: string }[] = [];
  if (hobby) steps.push({ label: "兴趣投入", value: hobby.name });
  if (journey) steps.push({ label: "学习 / 实践", value: journey.name });
  if (asset.minutes > 0 || asset.cost > 0) {
    steps.push({
      label: "投入",
      value: `${fmtHours(asset.minutes)}${asset.cost > 0 ? ` · ${fmtMoney(asset.cost)}` : ""}`,
    });
  }
  steps.push({ label: "沉淀", value: `${ASSET_TYPE[asset.type]} · ${asset.name}` });
  if (asset.incomeGenerated > 0 || income) {
    steps.push({
      label: "带来收入",
      value: fmtMoney(income?.revenue ?? asset.incomeGenerated),
    });
  }

  return (
    <Card className="p-5">
      <div className="text-[14.5px] font-medium text-foreground">{asset.name}</div>
      <div className="mt-4 space-y-0">
        {steps.map((step, index) => (
          <div key={`${step.label}-${index}`}>
            <div className="flex items-center gap-3 rounded-md border border-border/70 bg-secondary/30 px-3.5 py-2.5">
              <span className="label-caps w-[76px] shrink-0">{step.label}</span>
              <span className="min-w-0 flex-1 truncate text-[13.5px] text-foreground">{step.value}</span>
            </div>
            {index < steps.length - 1 && (
              <div className="flex justify-center py-1">
                <ArrowDown className="size-3.5 text-muted-foreground/60" />
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
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

function Mini({ label, value, tone }: { label: string; value: string; tone?: boolean }) {
  return (
    <div>
      <div className="text-[11.5px] text-muted-foreground">{label}</div>
      <div
        className={
          tone
            ? "mt-1 numeral text-[15px] font-medium text-primary"
            : "mt-1 numeral text-[15px] font-medium text-foreground"
        }
      >
        {value}
      </div>
    </div>
  );
}

export function AssetDetailPage({ assetId }: { assetId: string }) {
  const { data } = useApp();
  const { openModal } = useUI();
  const asset = data.assets.find((a) => a.id === assetId);

  const relatedEvents = useMemo(
    () => data.events.filter((e) => e.assetId === assetId),
    [data.events, assetId],
  );
  const income = useMemo(
    () => data.incomes.filter((i) => i.assetId === assetId),
    [data.incomes, assetId],
  );

  if (!asset) {
    return (
      <div className="animate-fade-up">
        <PageHeader title="Asset" back="#/assets" />
        <Card className="mt-4 px-2 py-2">
          <EmptyState title="这个资产已经不在了。" />
        </Card>
      </div>
    );
  }

  const hobby = data.hobbies.find((h) => h.id === asset.sourceHobbyId);
  const journey = data.journeys.find((j) => j.id === asset.sourceJourneyId);
  const source = data.incomes.find((i) => i.id === asset.sourceIncomeId);

  return (
    <div className="animate-fade-up">
      <PageHeader
        back="#/assets"
        eyebrow={ASSET_TYPE[asset.type]}
        title={asset.name}
        subtitle={`Created ${fmtDate(asset.createdDate)}`}
        actions={
          <Button
            size="pill"
            variant="outline"
            onClick={() => openModal("asset", { initial: asset })}
          >
            编辑
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 pt-4 sm:grid-cols-3 lg:pt-0">
        <Tile label="Time invested" value={fmtHours(asset.minutes)} />
        <Tile label="Cost" value={fmtMoney(asset.cost)} />
        <Tile label="Income generated" value={fmtMoney(asset.incomeGenerated)} tone />
      </div>

      {(hobby || journey || source) && (
        <section className="pt-7">
          <SectionHeader title="来源" />
          <Card className="divide-y divide-border/70 px-5">
            {hobby && <Row label="来源兴趣" value={hobby.name} />}
            {journey && <Row label="来源 Journey" value={journey.name} />}
            {source && <Row label="来源收入项目" value={source.name} />}
          </Card>
        </section>
      )}

      {asset.note && (
        <section className="pt-7">
          <SectionHeader title="Note" />
          <Card className="p-5 text-[14px] leading-relaxed text-foreground/85">{asset.note}</Card>
        </section>
      )}

      {asset.link && (
        <section className="pt-7">
          <SectionHeader title="Link" />
          <Card className="p-5">
            <a href={asset.link} target="_blank" rel="noreferrer" className="text-[14px] text-primary hover:underline">
              {asset.link}
            </a>
          </Card>
        </section>
      )}

      {income.length > 0 && (
        <section className="pt-7">
          <SectionHeader title="带来的收入" />
          <Card className="divide-y divide-border/70 px-5">
            {income.map((project) => (
              <Row
                key={project.id}
                label={`${project.name} · ${fmtDate(project.date)}`}
                value={fmtMoney(project.revenue)}
              />
            ))}
          </Card>
        </section>
      )}

      {asset.photoIds.length > 0 && (
        <section className="pt-7">
          <SectionHeader title="Photos" />
          <PhotoGrid ids={asset.photoIds} columns={3} className="max-w-lg" />
        </section>
      )}

      {relatedEvents.length > 0 && (
        <section className="pt-7">
          <SectionHeader title="相关记录" />
          <Card className="divide-y divide-border/70 px-5">
            {relatedEvents.map((event) => (
              <Row key={event.id} label={`${fmtDate(event.date)} · ${event.title}`} value={fmtHours(event.durationMin ?? 0)} />
            ))}
          </Card>
        </section>
      )}
    </div>
  );
}

function Tile({ label, value, tone }: { label: string; value: string; tone?: boolean }) {
  return (
    <div className="surface px-4 py-3.5">
      <div className="label-caps">{label}</div>
      <div
        className={
          tone
            ? "mt-2 numeral text-[22px] font-medium leading-none text-primary"
            : "mt-2 numeral text-[22px] font-medium leading-none text-foreground"
        }
      >
        {value}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <span className="min-w-0 flex-1 truncate text-[13.5px] text-muted-foreground">{label}</span>
      <span className="numeral shrink-0 text-[13.5px] text-foreground">{value}</span>
    </div>
  );
}
