/**
 * 同步的决策部分，刻意做成不依赖任何浏览器 API 的纯函数，
 * 这样冲突合并规则可以被单独测到（见 scripts/test-sync.mjs）。
 *
 * 规则：
 *   1. 每条记录带 updatedAt，两边都有时取更新的那一份
 *   2. 删除留下墓碑；墓碑比记录新，才代表"确实删掉了"
 *   3. 如果记录在删除之后又被改过（updatedAt 比墓碑新），说明是复活，记录胜出
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
  /** 从本地删除（远端已删且更新） */
  deleteLocal: { store: string; id: string }[];
  /** 上传到云端（本地更新） */
  push: RemoteRow[];
}

export const keyOf = (store: string, id: string) => `${store}:${id}`;

export function planSync(input: {
  local: LocalRecord[];
  remote: RemoteRow[];
  tombstones: Record<string, string>;
  userId: string;
  /**
   * 这台设备第一次连上云同步，而且云端已经有数据。
   *
   * 这时以云端为准：本地同名记录一律被云端覆盖，本地的"独有记录"和墓碑都不上传。
   * 否则新设备刚生成的 Demo 数据（时间戳是"刚刚"）会盖掉用户几个月前在
   * 电脑上记的真实内容 —— 这是最危险的一种数据丢失。
   */
  firstSync?: boolean;
  /**
   * 本地只是一份没被改过的示例数据时，第一次连接就把本地多余记录丢掉。
   *
   * 否则新设备会带着几百条示例数据连上云端：第一次同步以云端为准没错，
   * 但这些记录还留在本地，用户随便改点什么就会被推上去，污染干净的数据。
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

  const remoteMap = new Map<string, RemoteRow>();
  for (const row of remote) remoteMap.set(keyOf(row.store, row.id), row);

  const localMap = new Map<string, LocalRecord>();
  for (const row of local) localMap.set(keyOf(row.store, row.id), row);

  const plan: SyncPlan = { pull: [], deleteLocal: [], push: [] };

  /* ---------- 远端 → 本地 ---------- */
  for (const [k, row] of remoteMap) {
    const mine = localMap.get(k);

    if (row.deleted) {
      if (mine && (cloudWins || mine.updatedAt <= row.updated_at)) {
        plan.deleteLocal.push({ store: row.store, id: row.id });
        localMap.delete(k);
      }
      continue;
    }

    /*
     * 本地刚把这条删掉（墓碑比云端这份还新）时，绝对不能拉回来。
     *
     * 否则会出现最让人困惑的现象：刚删的记录当场复活，
     * 而云端在同一轮同步里已经被标记成删除 —— 要等下一次同步才真正消失。
     * 该删就交给下面的墓碑逻辑去推。
     */
    const tomb = tombstones[k];
    if (tomb && tomb >= row.updated_at && !cloudWins) continue;

    if (!mine || cloudWins || mine.updatedAt < row.updated_at) {
      plan.pull.push(row);
      if (mine) localMap.set(k, { ...mine, updatedAt: row.updated_at, data: row.data ?? {} });
      else
        localMap.set(k, {
          store: row.store,
          id: row.id,
          updatedAt: row.updated_at,
          data: row.data ?? {},
        });
    }
  }

  /* ---------- 本地 → 远端 ---------- */
  if (cloudWins) {
    if (dropLocalExtras) {
      for (const [k, mine] of localMap) {
        if (!remoteMap.has(k)) plan.deleteLocal.push({ store: mine.store, id: mine.id });
      }
    }
    return plan;
  }

  for (const [k, mine] of localMap) {
    const tomb = tombstones[k];
    if (tomb && tomb >= mine.updatedAt) continue; // 本地已删且没有复活
    const row = remoteMap.get(k);
    if (!row || row.deleted || row.updated_at < mine.updatedAt) {
      plan.push.push({
        store: mine.store,
        id: mine.id,
        data: mine.data,
        updated_at: mine.updatedAt,
        deleted: false,
        user_id: userId,
      });
    }
  }

  /* ---------- 墓碑 → 远端 ---------- */
  for (const [k, at] of Object.entries(tombstones)) {
    /*
     * 云端从来没有过这条记录，就没什么可删的。
     * id 是随机生成的，没上传过就不可能出现在别的设备上，
     * 所以"另一台设备又把它推回来"这种竞态并不存在。
     */
    const row = remoteMap.get(k);
    if (!row) continue;

    const mine = localMap.get(k);
    if (mine && mine.updatedAt > at) continue; // 记录在删除之后又被改过 → 复活
    if (row.updated_at < at) {
      const [store, id] = splitKey(k);
      if (!store || !id) continue;
      plan.push.push({
        store,
        id,
        data: null,
        updated_at: at,
        deleted: true,
        user_id: userId,
      });
    }
  }

  return plan;
}

export function splitKey(k: string): [string, string] {
  const at = k.indexOf(":");
  if (at < 0) return ["", ""];
  return [k.slice(0, at), k.slice(at + 1)];
}
