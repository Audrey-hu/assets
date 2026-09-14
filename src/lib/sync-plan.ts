/**
 * 同步的决策部分。刻意做成不依赖任何浏览器 API 的纯函数，
 * 这样冲突合并规则可以被单独测到（见 scripts/test-sync.mjs）。
 *
 * 规则：
 *   1. 删除优先。只要这条记录存在墓碑（本地或云端），它就是删除状态。
 *      个人账本里"删了又冒出来"比"离线改的那一版没了"更让人恼火，
 *      而且时间戳会因为时区、时钟不准而不可靠，不该让编辑去翻案。
 *      墓碑 90 天后会清理，所以也不是永久封印。
 *   2. 没有墓碑时，按 updatedAt 取更新的那一份（last-write-wins）。
 *   3. 时间一律按真实时刻比较，不按字符串 ——
 *      "T12:00:00"、"T12:00:00+00:00"、"T04:00:00.000Z" 混在一起比字符串毫无意义。
 */

export interface RemoteRow {
  store: string;
  id: string;
  data: Record<string, unknown> | null;
  updated_at: string;
  deleted: boolean;
  user_id?: string;
}

export interface LocalRecord {
  store: string;
  id: string;
  updatedAt: string;
  data: Record<string, unknown>;
}

export interface SyncPlan {
  /** 写进本地（远端更新） */
  pull: RemoteRow[];
  /** 从本地删除 */
  deleteLocal: { store: string; id: string }[];
  /** 上传到云端 */
  push: RemoteRow[];
}

export const keyOf = (store: string, id: string) => `${store}:${id}`;

/** 解析成毫秒；解析不了按 0 处理，避免 NaN 让比较整体失效 */
function time(value: string | null | undefined): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

/** 统一写成带时区的 UTC 形式再存进数据库 */
function iso(value: string): string {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? new Date().toISOString() : new Date(parsed).toISOString();
}

function splitKey(k: string): [string, string] {
  const at = k.indexOf(":");
  if (at < 0) return ["", ""];
  return [k.slice(0, at), k.slice(at + 1)];
}

/** 允许的时钟误差：超过这个范围的"未来时间"一律视为坏数据 */
const CLOCK_SKEW_MS = 5 * 60 * 1000;

export function planSync(input: {
  local: LocalRecord[];
  remote: RemoteRow[];
  tombstones: Record<string, string>;
  userId: string;
  /**
   * 这台设备第一次连上云同步，而且云端已经有数据。
   *
   * 这时以云端为准：本地同名记录一律被云端覆盖，本地的删除和"独有记录"都不上传。
   * 否则新设备刚生成的示例数据（时间戳是"刚刚"）会盖掉用户几个月前在
   * 电脑上记的真实内容 —— 这是最危险的一种数据丢失。
   */
  firstSync?: boolean;
  /**
   * 本地只是一份没被改过的示例数据时，第一次连接就把本地多余记录丢掉。
   */
  dropLocalExtras?: boolean;
}): SyncPlan {
  const {
    local,
    remote,
    tombstones,
    userId,
    firstSync = false,
    dropLocalExtras = false,
  } = input;

  const cloudHasData = remote.some((row) => !row.deleted);
  const cloudWins = firstSync && cloudHasData;
  const now = Date.now();

  const remoteMap = new Map<string, RemoteRow>();
  for (const row of remote) remoteMap.set(keyOf(row.store, row.id), row);

  const localMap = new Map<string, LocalRecord>();
  for (const row of local) localMap.set(keyOf(row.store, row.id), row);

  const plan: SyncPlan = { pull: [], deleteLocal: [], push: [] };
  /* 这一轮刚从云端拿下来的，内容已经和云端一致，不用再推回去 */
  const pulled = new Set<string>();

  /* ---------- 1. 本地墓碑优先：说过删了就是删了 ---------- */
  for (const [k, at] of Object.entries(tombstones)) {
    if (cloudWins) continue; // 首次连接以云端为准，本地的删除不参与

    const mine = localMap.get(k);
    if (mine) {
      /* 上一轮同步可能把这条又拉回来过，这里一并清掉 */
      plan.deleteLocal.push({ store: mine.store, id: mine.id });
      localMap.delete(k);
    }

    const row = remoteMap.get(k);
    if (row && !row.deleted) {
      const [store, id] = splitKey(k);
      if (!store || !id) continue;
      plan.push.push({
        store,
        id,
        data: null,
        updated_at: iso(at),
        deleted: true,
        user_id: userId,
      });
    }
  }

  /* ---------- 2. 云端 → 本地 ---------- */
  for (const [k, row] of remoteMap) {
    /* 本地已经删掉的，云端这份再新也不拉回来 */
    if (tombstones[k] && !cloudWins) continue;

    const mine = localMap.get(k);
    /*
     * 云端时间戳落在未来 = 坏数据（历史版本写过不带时区的字符串，
     * 存进 UTC 数据库就成了"晚上 8 点"）。这种值不能拿来比较，
     * 否则用户今天之内编辑这条记录时，改动会被判定为"过期"而悄悄回滚。
     * 遇到就一律让本地这份赢，顺便把它改写成正常时间。
     */
    const remoteIsFuture = time(row.updated_at) > now + CLOCK_SKEW_MS;

    if (row.deleted) {
      if (mine) {
        plan.deleteLocal.push({ store: row.store, id: row.id });
        localMap.delete(k);
      }
      continue;
    }

    if (!mine || cloudWins || (!remoteIsFuture && time(mine.updatedAt) < time(row.updated_at))) {
      plan.pull.push(row);
      pulled.add(k);
      localMap.set(k, {
        store: row.store,
        id: row.id,
        updatedAt: iso(row.updated_at),
        data: row.data ?? {},
      });
    }
  }

  /* ---------- 3. 本地 → 云端 ---------- */
  if (cloudWins) {
    if (dropLocalExtras) {
      for (const [k, mine] of localMap) {
        if (!remoteMap.has(k)) plan.deleteLocal.push({ store: mine.store, id: mine.id });
      }
    }
    return plan;
  }

  for (const [k, mine] of localMap) {
    if (pulled.has(k)) continue;
    const row = remoteMap.get(k);
    const remoteIsFuture = Boolean(row) && time(row!.updated_at) > now + CLOCK_SKEW_MS;
    if (!row || row.deleted || remoteIsFuture || time(row.updated_at) < time(mine.updatedAt)) {
      plan.push.push({
        store: mine.store,
        id: mine.id,
        data: mine.data,
        updated_at: iso(mine.updatedAt),
        deleted: false,
        user_id: userId,
      });
    }
  }

  return plan;
}
