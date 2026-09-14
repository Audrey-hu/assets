import { getAll, putMany, resetDatabase, setMeta, setTombstones } from "./db";
import { defaultSettings, loadSettings, saveSettings } from "./settings";
import type { BackupFile, Photo, Settings } from "./types";

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}

export async function buildBackup(): Promise<BackupFile> {
  const [hobbies, journeys, stages, events, courses, incomes, assets, savings, investments, savingsTx, snapshots, photos] =
    await Promise.all([
      getAll("hobbies"),
      getAll("journeys"),
      getAll("stages"),
      getAll("events"),
      getAll("courses"),
      getAll("incomes"),
      getAll("assets"),
      getAll("savings"),
      getAll("investments"),
      getAll("savingsTx"),
      getAll("snapshots"),
      getAll("photos"),
    ]);

  const encodedPhotos = await Promise.all(
    photos.map(async (p) => ({
      id: p.id,
      name: p.name,
      mime: p.mime,
      createdAt: p.createdAt,
      dataUrl: await blobToDataUrl(p.blob),
    })),
  );

  return {
    app: "LifeLedger",
    version: 1,
    exportedAt: new Date().toISOString(),
    settings: loadSettings(),
    data: {
      hobbies,
      journeys,
      stages,
      events,
      courses,
      incomes,
      assets,
      savings,
      investments,
      savingsTx,
      snapshots,
      photos: encodedPhotos,
    },
  };
}

export async function importBackup(file: File): Promise<Settings> {
  const text = await file.text();
  const parsed = JSON.parse(text) as BackupFile;
  /* 旧版本导出的备份里 app 字段是 LifeLedger，两边都接受 */
  if (!["LifeLedger", "人生账本"].includes(parsed?.app) || !parsed.data) {
    throw new Error("这不是有效的人生账本备份文件。");
  }

  await resetDatabase();

  /*
   * 导入备份 = 用备份内容替换全部数据，是一次「恢复」而不是「删除」：
   *   - 清掉墓碑，否则下次同步会把刚导入的记录当成已删除
   *   - 把 updatedAt 刷成当前时间，让恢复的内容在同步时胜出
   */
  await setTombstones({});
  const restoredAt = new Date().toISOString();
  const refreshed = <T extends object>(rows: T[] | undefined): (T & { updatedAt: string })[] =>
    (rows ?? []).map((row) => ({ ...row, updatedAt: restoredAt }));

  await Promise.all([
    putMany("hobbies", refreshed(parsed.data.hobbies)),
    putMany("journeys", refreshed(parsed.data.journeys)),
    putMany("stages", refreshed(parsed.data.stages)),
    putMany("events", refreshed(parsed.data.events)),
    putMany("courses", refreshed(parsed.data.courses)),
    putMany("incomes", refreshed(parsed.data.incomes)),
    putMany("assets", refreshed(parsed.data.assets)),
    putMany("savings", refreshed(parsed.data.savings)),
    putMany("investments", refreshed(parsed.data.investments)),
    putMany("savingsTx", refreshed(parsed.data.savingsTx)),
    putMany("snapshots", refreshed(parsed.data.snapshots)),
  ]);

  const photos: Photo[] = await Promise.all(
    (parsed.data.photos ?? []).map(async (p) => ({
      id: p.id,
      name: p.name,
      mime: p.mime,
      createdAt: p.createdAt,
      blob: await dataUrlToBlob(p.dataUrl),
      size: 0,
    })),
  );
  await putMany("photos", photos);

  const settings: Settings = {
    ...defaultSettings,
    ...(parsed.settings ?? {}),
    demoSeeded: (parsed.settings?.demoSeeded ?? false) || true,
  };
  saveSettings(settings);
  await setMeta("seeded", true);
  return settings;
}
