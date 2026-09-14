import { useEffect, useRef, useState } from "react";
import { Database, Download, Info, RotateCcw, Trash2, Upload } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, KeyValue, SectionHeader } from "@/components/ui/display";
import { Field, Input, Select, Switch } from "@/components/ui/form";
import { useApp } from "@/store/app-store";
import { useUI } from "@/store/ui-store";
import { buildBackup, importBackup } from "@/lib/backup";
import { estimateUsage } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import { CURRENCIES } from "@/lib/format";
import { download } from "@/lib/utils";
import type { Settings } from "@/lib/types";
import { navigate } from "@/lib/router";
import { CloudSyncSection } from "./CloudSyncSection";
import { useSync } from "@/store/sync-store";

export function MePage() {
  const { data, settings, storage, updateSettings, clearAllData, loadDemoData, reload, notify } =
    useApp();
  const { askConfirm } = useUI();
  const { session: cloudSession } = useSync();
  const fileRef = useRef<HTMLInputElement>(null);
  const [usage, setUsage] = useState<{ usage: number; quota: number } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    estimateUsage().then(setUsage);
  }, [data]);

  const counts = {
    hobbies: data.hobbies.length,
    journeys: data.journeys.length,
    events: data.events.length,
    incomes: data.incomes.length,
    assets: data.assets.length,
    savings: data.savings.length,
  };

  async function handleExport() {
    setBusy(true);
    const backup = await buildBackup();
    const stamp = new Date().toISOString().slice(0, 10);
    download(`人生账本-备份-${stamp}.json`, JSON.stringify(backup, null, 2));
    updateSettings({ lastBackupAt: new Date().toISOString() });
    notify("已导出 JSON 备份", "success");
    setBusy(false);
  }

  return (
    <div className="animate-fade-up">
      <PageHeader eyebrow="人生账本" title="Me" subtitle="记录、数据与偏好" />

      <section className="pt-2 lg:pt-0">
        <SectionHeader title="Profile" />
        <Card className="space-y-4 p-5">
          <Field label="称呼" hint="可选">
            <Input
              value={settings.displayName}
              placeholder="你希望怎么被称呼？"
              onChange={(event) => updateSettings({ displayName: event.target.value })}
            />
          </Field>
          <p className="text-[12.5px] leading-relaxed text-muted-foreground">
            人生账本不会催促你。3 天没练习不叫失败，那只是生活的一部分。
          </p>
        </Card>
      </section>

      <section className="pt-7">
        <SectionHeader title="Preferences" />
        <Card className="divide-y divide-border/70 px-5 py-2">
          <div className="grid gap-4 py-3 sm:grid-cols-2">
            <Field label="默认货币">
              <Select
                value={settings.currency}
                onChange={(event) =>
                  updateSettings({ currency: event.target.value as Settings["currency"] })
                }
              >
                {CURRENCIES.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="日期格式">
              <Select
                value={settings.dateFormat}
                onChange={(event) =>
                  updateSettings({ dateFormat: event.target.value as Settings["dateFormat"] })
                }
              >
                <option value="YYYY.MM.DD">2026.09.10</option>
                <option value="YYYY-MM-DD">2026-09-10</option>
                <option value="MM/DD/YYYY">09/10/2026</option>
              </Select>
            </Field>
          </div>
          <div className="py-3">
            <Switch
              checked={settings.theme === "dark"}
              onCheckedChange={(value) => updateSettings({ theme: value ? "dark" : "light" })}
              label="深色模式"
              description="夜晚使用更安静一些。"
            />
          </div>
          <div className="py-3">
            <Switch
              checked={settings.weekStartsOn === 1}
              onCheckedChange={(value) => updateSettings({ weekStartsOn: value ? 1 : 0 })}
              label="每周从周一开始"
              description="影响日历与本周统计。"
            />
          </div>
          <div className="py-3">
            <Switch
              checked={settings.seedDemo !== false}
              onCheckedChange={(value) => updateSettings({ seedDemo: value })}
              label="新设备首次打开时生成示例数据"
              description="关掉之后，这台设备（或新设备）第一次打开就是空白的。"
            />
          </div>
        </Card>
      </section>

      <CloudSyncSection />

      <section className="pt-7">
        <SectionHeader title="Data" hint="所有数据保存在这台设备上" />
        <Card className="px-5 py-2">
          <div className="divide-y divide-border/70">
            <KeyValue label="兴趣" value={counts.hobbies} />
            <KeyValue label="Journey" value={counts.journeys} />
            <KeyValue label="记录" value={counts.events} />
            <KeyValue label="业余收入项目" value={counts.incomes} />
            <KeyValue label="沉淀资产" value={counts.assets} />
            <KeyValue label="存款记录" value={counts.savings} />
          </div>
          {storage && (
            <div className="border-t border-border/70 py-3 text-[12px] leading-relaxed text-muted-foreground">
              存储方式：<span className="text-foreground/80">{storage.label}</span>
              {storage.backend === "localStorage" && (
                <>
                  <br />
                  现在是用「直接打开文件」的方式运行的，浏览器只给约 5MB
                  空间，照片建议少放几张。改用服务器版可以获得大得多的容量。
                </>
              )}
              {storage.backend === "memory" && (
                <>
                  <br />
                  当前浏览器不允许页面保存数据。用服务器版打开就没问题。
                </>
              )}
            </div>
          )}
          {usage && usage.quota > 0 && (
            <div className="border-t border-border/70 py-3 text-[12px] text-muted-foreground">
              已使用约 {(usage.usage / 1024 / 1024).toFixed(1)} MB
              {storage?.backend === "indexedDB"
                ? ` / ${(usage.quota / 1024 / 1024 / 1024).toFixed(1)} GB`
                : ` / ${(usage.quota / 1024 / 1024).toFixed(0)} MB`}
            </div>
          )}
          {settings.lastBackupAt && (
            <div className="border-t border-border/70 py-3 text-[12px] text-muted-foreground">
              上次导出：{fmtDate(settings.lastBackupAt.slice(0, 10))}
            </div>
          )}
        </Card>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Button variant="outline" size="lg" onClick={handleExport} disabled={busy}>
            <Download className="size-4" />
            导出 JSON
          </Button>
          <Button variant="outline" size="lg" onClick={() => fileRef.current?.click()}>
            <Upload className="size-4" />
            导入 JSON
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              try {
                const next = await importBackup(file);
                updateSettings(next);
                await reload();
                notify("导入完成", "success");
              } catch (error) {
                notify(error instanceof Error ? error.message : "导入失败");
              }
              if (fileRef.current) fileRef.current.value = "";
            }}
          />
        </div>

      </section>

      <section className="pt-7">
        <SectionHeader title="重新开始" hint="把应用恢复到全新的状态" />
        <Card className="space-y-4 p-5">
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            数据存在这台设备的浏览器里，不上云（除非你自己开了云同步）。
            想要一个干净的账本，就在下面清空；想先看看完整的界面长什么样，随时可以再载入示例数据。
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              variant="outline"
              size="lg"
              onClick={() =>
                askConfirm({
                  title: "载入示例数据？",
                  description:
                    "会在现有数据之上加入一组 Demo 内容（架子鼓、SQE1、存款等）。已有记录不会被删除。",
                  confirmLabel: "载入",
                  onConfirm: loadDemoData,
                })
              }
            >
              <RotateCcw className="size-4" />
              载入示例数据
            </Button>
            <Button
              variant="destructive"
              size="lg"
              onClick={() =>
                askConfirm({
                  title: "清空所有数据？",
                  description: cloudSession
                    ? "这台设备上的兴趣、Journey、阶段、记录、照片、存款会全部永久删除，无法恢复。云同步已开启，云端内容也会一起清空。建议先导出备份。"
                    : "这台设备上的兴趣、Journey、阶段、记录、照片、存款会全部永久删除，无法恢复。建议先导出备份。",
                  confirmLabel: "永久删除",
                  destructive: true,
                  onConfirm: async () => {
                    await clearAllData();
                    navigate("#/today");
                  },
                })
              }
            >
              <Trash2 className="size-4" />
              清空所有数据
            </Button>
          </div>
          <p className="text-[12px] leading-relaxed text-muted-foreground">
            只清空这一台设备。如果你在手机上也记过东西，需要在那边同样操作一次
            —— 每台设备的数据是各自独立的。
          </p>
        </Card>
      </section>

      <section className="pt-7">
        <SectionHeader title="Explore" />
        <Card className="divide-y divide-border/70 px-5">
          <button
            type="button"
            onClick={() => navigate("#/calendar")}
            className="flex w-full items-center justify-between py-3 text-left"
          >
            <span className="text-[13.5px] text-foreground">Calendar</span>
            <span className="text-[12.5px] text-muted-foreground">每一天的记录</span>
          </button>
          <button
            type="button"
            onClick={() => navigate("#/moments")}
            className="flex w-full items-center justify-between py-3 text-left"
          >
            <span className="text-[13.5px] text-foreground">Life Moments</span>
            <span className="text-[12.5px] text-muted-foreground">照片时间线</span>
          </button>
          <button
            type="button"
            onClick={() => navigate(`#/review/${new Date().toISOString().slice(0, 7)}`)}
            className="flex w-full items-center justify-between py-3 text-left"
          >
            <span className="text-[13.5px] text-foreground">Monthly Review</span>
            <span className="text-[12.5px] text-muted-foreground">这个月的回顾</span>
          </button>
        </Card>
      </section>

      <section className="pt-7">
        <SectionHeader title="关于人生账本" />
        <Card className="space-y-3 p-5">
          <div className="flex items-center gap-2.5 text-[14px] font-medium text-foreground">
            <Info className="size-4 text-muted-foreground" />
            人生账本 · v1.0
          </div>
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            记录你如何使用自己的钱和时间，以及这些投入最终留下了什么。
            <br />
            它不关心今天花了多少，只关心这些年你把自己变成了什么。
          </p>
          <div className="flex items-center gap-2 pt-1 text-[12px] text-muted-foreground">
            <Database className="size-3.5" />
            IndexedDB + localStorage · 无需登录
          </div>
        </Card>
      </section>
    </div>
  );
}
