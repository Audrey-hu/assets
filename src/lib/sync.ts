import {
  deleteRecord,
  getAll,
  getPhotoBlob,
  getTombstones,
  pruneTombstones,
  putMany,
  putRecord,
  type StoreName,
} from "./db";
import { ITEMS_TABLE, PHOTO_BUCKET, getClient, getSession } from "./cloud";
import { planSync, type LocalRecord, type RemoteRow } from "./sync-plan";

/**
 * 同步的执行部分：把本地和云端拉齐。
 * 冲突怎么判由 sync-plan.ts 里的纯函数决定，这里只负责 I/O。
 *
 * 个人数据量很小（几百到几千条），所以每次同步直接拉全量——
 * 比维护增量游标简单得多，也不容易出错。
 */

const SYNCED_STORES: StoreName[] = [
  "hobbies",
  "journeys",
  "stages",
  "events",
  "courses",
  "incomes",
  "assets",
  "savings",
  "investments",
  "savingsTx",
  "snapshots",
];

/** 一次网络往返取多少行 */
const PAGE_SIZE = 1000;

export interface SyncStats {
  pulled: number;
  pushed: number;
  deletedLocal: number;
  photosUp: number;
  photosDown: number;
  finishedAt: string;
}

type Progress = (message: string) => void;

export async function runSync(
  onProgress: Progress = () => undefined,
  options: { firstSync?: boolean; dropLocalExtras?: boolean } = {},
): Promise<SyncStats> {
  const supabase = getClient();
  if (!supabase) throw new Error("还没有配置 Supabase 连接信息。");
  const session = await getSession();
  if (!session) throw new Error("还没有登录。");
  const userId = session.user.id;

  /* ---------------- 1. 拉云端 ---------------- */
  onProgress("正在读取云端…");
  const remote: RemoteRow[] = [];
  /*
   * Supabase 的 REST 接口默认每次最多返回 1000 行，
   * 记录多了必须翻页拉，否则会静默丢数据。
   */
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data: rows, error } = await supabase
      .from(ITEMS_TABLE)
      .select("store,id,data,updated_at,deleted")
      .eq("user_id", userId)
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`读取云端失败：${error.message}`);
    const page = (rows ?? []) as RemoteRow[];
    remote.push(...page);
    if (page.length < PAGE_SIZE) break;
  }

  /* ---------------- 2. 读本地 ---------------- */
  onProgress("正在读取本地…");
  const local: LocalRecord[] = [];
  for (const store of SYNCED_STORES) {
    for (const record of await getAll(store as never)) {
      const typed = record as { id: string; updatedAt?: string };
      local.push({
        store,
        id: typed.id,
        updatedAt: typed.updatedAt ?? new Date(0).toISOString(),
        data: record as unknown as Record<string, unknown>,
      });
    }
  }
  const tombstones = await getTombstones();

  /* ---------------- 3. 决策 ---------------- */
  const plan = planSync({
    local,
    remote,
    tombstones,
    userId,
    firstSync: options.firstSync,
    dropLocalExtras: options.dropLocalExtras,
  });
  const stats: SyncStats = {
    pulled: plan.pull.length,
    pushed: plan.push.length,
    deletedLocal: plan.deleteLocal.length,
    photosUp: 0,
    photosDown: 0,
    finishedAt: new Date().toISOString(),
  };

  /* ---------------- 4. 落到本地 ---------------- */
  const removed = new Set(plan.deleteLocal.map((item) => `${item.store}:${item.id}`));
  for (const item of plan.deleteLocal) {
    /* 云端已经删掉了，本地不要再留墓碑 */
    await deleteRecord(item.store as StoreName, item.id, { tombstone: false });
  }
  for (const row of plan.pull) {
    await putRecord(row.store as never, row.data as never);
  }

  /* ---------------- 5. 推到云端 ---------------- */
  onProgress("正在上传本地改动…");
  for (let i = 0; i < plan.push.length; i += 200) {
    const chunk = plan.push.slice(i, i + 200);
    const { error: upsertError } = await supabase
      .from(ITEMS_TABLE)
      .upsert(chunk as never[], { onConflict: "user_id,store,id" });
    if (upsertError) throw new Error(`上传失败：${upsertError.message}`);
  }

  /* ---------------- 6. 照片 ---------------- */
  const photos = await syncPhotos(
    userId,
    local.filter((record) => !removed.has(`${record.store}:${record.id}`)),
    plan.pull,
    onProgress,
  );
  stats.photosUp = photos.up;
  stats.photosDown = photos.down;

  await pruneTombstones();
  stats.finishedAt = new Date().toISOString();
  return stats;
}

/**
 * 照片按 id 对账：记录里引用到的照片，本地缺就下载，云端缺就上传。
 * 不做远端删除——留几个孤儿文件，比误删用户的照片安全。
 */
async function syncPhotos(
  userId: string,
  local: LocalRecord[],
  pulled: RemoteRow[],
  onProgress: Progress,
) {
  const supabase = getClient();
  if (!supabase) return { up: 0, down: 0 };

  const referenced = new Set<string>();
  const collect = (data: unknown) => {
    for (const id of (data as { photoIds?: string[] } | null)?.photoIds ?? []) referenced.add(id);
  };
  for (const record of local) collect(record.data);
  for (const row of pulled) collect(row.data);
  if (referenced.size === 0) return { up: 0, down: 0 };

  onProgress("正在对账照片…");
  const remoteIds = new Set<string>();
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data: listing } = await supabase.storage
      .from(PHOTO_BUCKET)
      .list(userId, { limit: PAGE_SIZE, offset });
    const page = listing ?? [];
    for (const item of page) remoteIds.add(item.name.replace(/\.[a-z0-9]+$/i, ""));
    if (page.length < PAGE_SIZE) break;
  }

  let up = 0;
  let down = 0;
  const downloaded: { id: string; blob: Blob; name: string; mime: string; createdAt: string }[] = [];

  for (const id of referenced) {
    const blob = await getPhotoBlob(id);
    if (blob) {
      if (!remoteIds.has(id)) {
        const extension =
          blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg";
        const { error } = await supabase.storage
          .from(PHOTO_BUCKET)
          .upload(`${userId}/${id}.${extension}`, blob, { contentType: blob.type, upsert: true });
        if (!error) up += 1;
      }
      continue;
    }
    if (!remoteIds.has(id)) continue;
    for (const extension of ["jpg", "png", "webp"]) {
      const { data: file, error } = await supabase.storage
        .from(PHOTO_BUCKET)
        .download(`${userId}/${id}.${extension}`);
      if (error || !file) continue;
      downloaded.push({
        id,
        blob: file,
        name: `${id}.${extension}`,
        mime: file.type || "image/jpeg",
        createdAt: new Date().toISOString(),
      });
      down += 1;
      break;
    }
  }

  if (downloaded.length) {
    await putMany(
      "photos",
      downloaded.map((item) => ({ ...item, size: item.blob.size })),
    );
  }
  return { up, down };
}
