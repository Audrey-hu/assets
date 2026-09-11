import { getAll, putMany, resetDatabase, setMeta } from "./db";
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
  const [hobbies, journeys, stages, events, courses, incomes, assets, savings, savingsTx, snapshots, photos] =
    await Promise.all([
      getAll("hobbies"),
      getAll("journeys"),
      getAll("stages"),
      getAll("events"),
      getAll("courses"),
      getAll("incomes"),
      getAll("assets"),
      getAll("savings"),
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

  await Promise.all([
    putMany("hobbies", parsed.data.hobbies ?? []),
    putMany("journeys", parsed.data.journeys ?? []),
    putMany("stages", parsed.data.stages ?? []),
    putMany("events", parsed.data.events ?? []),
    putMany("courses", parsed.data.courses ?? []),
    putMany("incomes", parsed.data.incomes ?? []),
    putMany("assets", parsed.data.assets ?? []),
    putMany("savings", parsed.data.savings ?? []),
    putMany("savingsTx", parsed.data.savingsTx ?? []),
    putMany("snapshots", parsed.data.snapshots ?? []),
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
