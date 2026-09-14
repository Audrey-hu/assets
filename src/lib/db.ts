import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { blobToDataUrl, dataUrlToBlob } from "./media";
import type {
  Asset,
  Course,
  Hobby,
  ID,
  IncomeProject,
  Journey,
  LifeEvent,
  Photo,
  SavingsItem,
  SavingsSnapshot,
  SavingsTx,
  Stage,
} from "./types";

/**
 * Storage is chosen at runtime.
 *
 *   indexedDB    → normal case (served over http/https)
 *   localStorage → 双击 HTML 文件打开时，浏览器会禁用 IndexedDB，这里自动降级
 *   memory       → 连 localStorage 都不可用时，至少让界面能用（刷新即丢）
 *
 * 三种后端实现同一套 API，上层 store 完全不需要知道区别。
 */

export type Backend = "indexedDB" | "localStorage" | "memory";

interface LifeLedgerDB extends DBSchema {
  hobbies: { key: string; value: Hobby };
  journeys: { key: string; value: Journey };
  stages: { key: string; value: Stage; indexes: { byJourney: string } };
  events: {
    key: string;
    value: LifeEvent;
    indexes: { byDate: string; byHobby: string; byJourney: string };
  };
  courses: { key: string; value: Course };
  incomes: { key: string; value: IncomeProject };
  assets: { key: string; value: Asset };
  savings: { key: string; value: SavingsItem };
  savingsTx: { key: string; value: SavingsTx };
  snapshots: { key: string; value: SavingsSnapshot };
  photos: { key: string; value: Photo };
  meta: { key: string; value: { key: string; value: unknown } };
}

export type StoreName =
  | "hobbies"
  | "journeys"
  | "stages"
  | "events"
  | "courses"
  | "incomes"
  | "assets"
  | "savings"
  | "savingsTx"
  | "snapshots"
  | "photos";

const DATA_STORES: StoreName[] = [
  "hobbies",
  "journeys",
  "stages",
  "events",
  "courses",
  "incomes",
  "assets",
  "savings",
  "savingsTx",
  "snapshots",
];

const DB_NAME = "lifeledger";
const DB_VERSION = 1;
const LS_PREFIX = "ll.v1.";

let dbPromise: Promise<IDBPDatabase<LifeLedgerDB>> | null = null;
let backend: Backend | null = null;

/* --------------------------------- IDB -------------------------------- */

function openDatabase() {
  if (!dbPromise) {
    dbPromise = openDB<LifeLedgerDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("hobbies")) db.createObjectStore("hobbies", { keyPath: "id" });
        if (!db.objectStoreNames.contains("journeys")) db.createObjectStore("journeys", { keyPath: "id" });
        if (!db.objectStoreNames.contains("stages")) {
          const s = db.createObjectStore("stages", { keyPath: "id" });
          s.createIndex("byJourney", "journeyId");
        }
        if (!db.objectStoreNames.contains("events")) {
          const s = db.createObjectStore("events", { keyPath: "id" });
          s.createIndex("byDate", "date");
          s.createIndex("byHobby", "hobbyId");
          s.createIndex("byJourney", "journeyId");
        }
        if (!db.objectStoreNames.contains("courses")) db.createObjectStore("courses", { keyPath: "id" });
        if (!db.objectStoreNames.contains("incomes")) db.createObjectStore("incomes", { keyPath: "id" });
        if (!db.objectStoreNames.contains("assets")) db.createObjectStore("assets", { keyPath: "id" });
        if (!db.objectStoreNames.contains("savings")) db.createObjectStore("savings", { keyPath: "id" });
        if (!db.objectStoreNames.contains("savingsTx")) db.createObjectStore("savingsTx", { keyPath: "id" });
        if (!db.objectStoreNames.contains("snapshots")) db.createObjectStore("snapshots", { keyPath: "id" });
        if (!db.objectStoreNames.contains("photos")) db.createObjectStore("photos", { keyPath: "id" });
        if (!db.objectStoreNames.contains("meta")) db.createObjectStore("meta", { keyPath: "key" });
      },
    });
  }
  return dbPromise;
}

/* ------------------------------ key/value ----------------------------- */

interface KeyValue {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
  keys(): string[];
}

const memoryStore = new Map<string, string>();

const memoryKV: KeyValue = {
  get: (key) => memoryStore.get(key) ?? null,
  set: (key, value) => void memoryStore.set(key, value),
  remove: (key) => void memoryStore.delete(key),
  keys: () => [...memoryStore.keys()],
};

const localKV: KeyValue = {
  get(key) {
    try {
      return localStorage.getItem(LS_PREFIX + key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    localStorage.setItem(LS_PREFIX + key, value);
  },
  remove(key) {
    try {
      localStorage.removeItem(LS_PREFIX + key);
    } catch {
      /* ignore */
    }
  },
  keys() {
    const out: string[] = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(LS_PREFIX)) out.push(key.slice(LS_PREFIX.length));
      }
    } catch {
      /* ignore */
    }
    return out;
  },
};

function kv(): KeyValue {
  return backend === "memory" ? memoryKV : localKV;
}

function kvGet<T>(key: string, fallback: T): T {
  const raw = kv().get(key);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function kvSet(key: string, value: unknown) {
  kv().set(key, JSON.stringify(value));
}

/* ------------------------------ detection ----------------------------- */

function canUseLocalStorage(): boolean {
  try {
    const probe = `${LS_PREFIX}probe`;
    localStorage.setItem(probe, "1");
    localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

async function canUseIndexedDB(): Promise<boolean> {
  if (typeof indexedDB === "undefined") return false;
  try {
    const db = await Promise.race([
      openDatabase(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
    ]);
    if (!db) return false;
    /* 真正写一次才算数：file:// 下 open 可能成功而写入抛 SecurityError */
    await db.put("meta", { key: "__probe", value: Date.now() });
    await db.delete("meta", "__probe");
    return true;
  } catch {
    return false;
  }
}

export async function initStorage(): Promise<Backend> {
  if (backend) return backend;
  const forced =
    typeof location !== "undefined"
      ? new URLSearchParams(location.search).get("storage")
      : null;
  if (forced === "local") backend = "localStorage";
  else if (forced === "memory") backend = "memory";
  else if (forced === "idb") backend = "indexedDB";
  else if (await canUseIndexedDB()) backend = "indexedDB";
  else if (canUseLocalStorage()) backend = "localStorage";
  else backend = "memory";
  return backend;
}

export async function getBackend(): Promise<Backend> {
  return initStorage();
}

export function backendLabel(value: Backend): string {
  switch (value) {
    case "indexedDB":
      return "IndexedDB";
    case "localStorage":
      return "浏览器本地存储";
    default:
      return "临时内存（关闭后不保留）";
  }
}

/* -------------------------------- reads ------------------------------- */

export async function getAll<K extends StoreName>(store: K): Promise<LifeLedgerDB[K]["value"][]> {
  const mode = await initStorage();
  if (mode === "indexedDB") {
    const db = await openDatabase();
    return (await db.getAll(store)) as LifeLedgerDB[K]["value"][];
  }
  if (store === "photos") {
    const index = kvGet<Omit<Photo, "blob">[]>("photos.index", []);
    const records = await Promise.all(
      index.map(async (entry) => {
        const dataUrl = kv().get(`photo.${entry.id}`);
        if (!dataUrl) return null;
        return { ...entry, blob: await dataUrlToBlob(dataUrl) } as Photo;
      }),
    );
    return records.filter(Boolean) as LifeLedgerDB[K]["value"][];
  }
  return kvGet<LifeLedgerDB[K]["value"][]>(`data.${store}`, []);
}

/** 只取 id，用于生成墓碑等场景，避免把照片 blob 也读出来。 */
export async function listIds(store: StoreName): Promise<string[]> {
  const mode = await initStorage();
  if (mode === "indexedDB") {
    const db = await openDatabase();
    return (await db.getAllKeys(store)) as string[];
  }
  if (store === "photos") {
    return kvGet<Omit<Photo, "blob">[]>("photos.index", []).map((item) => item.id);
  }
  return kvGet<{ id: string }[]>(`data.${store}`, []).map((row) => row.id);
}

/** 照片元数据（不含 blob），云同步需要。 */
export async function listPhotoMeta(): Promise<Omit<Photo, "blob">[]> {
  const mode = await initStorage();
  if (mode === "indexedDB") {
    const db = await openDatabase();
    const out: Omit<Photo, "blob">[] = [];
    let cursor = await db.transaction("photos").store.openCursor();
    while (cursor) {
      const { id, name, mime, size, createdAt } = cursor.value;
      out.push({ id, name, mime, size, createdAt });
      cursor = await cursor.continue();
    }
    return out;
  }
  return kvGet<Omit<Photo, "blob">[]>("photos.index", []);
}

/* -------------------------------- writes ------------------------------ */

export async function putRecord<K extends StoreName>(
  store: K,
  value: LifeLedgerDB[K]["value"],
) {
  const mode = await initStorage();
  if (mode === "indexedDB") {
    const db = await openDatabase();
    await db.put(store, value as never);
    return;
  }
  if (store === "photos") {
    const photo = value as Photo;
    kv().set(`photo.${photo.id}`, await blobToDataUrl(photo.blob));
    const index = kvGet<Omit<Photo, "blob">[]>("photos.index", []);
    kvSet(
      "photos.index",
      [...index.filter((item) => item.id !== photo.id), stripBlob(photo)],
    );
    return;
  }
  const rows = kvGet<{ id: string }[]>(`data.${store}`, []);
  const id = (value as { id: string }).id;
  kvSet(`data.${store}`, [...rows.filter((row) => row.id !== id), value as { id: string }]);
}

export async function putMany<K extends StoreName>(
  store: K,
  values: LifeLedgerDB[K]["value"][],
) {
  if (!values.length) return;
  const mode = await initStorage();
  if (mode === "indexedDB") {
    const db = await openDatabase();
    const tx = db.transaction(store, "readwrite");
    await Promise.all([...values.map((v) => tx.store.put(v as never)), tx.done]);
    return;
  }
  if (store === "photos") {
    const index = kvGet<Omit<Photo, "blob">[]>("photos.index", []);
    const next = [...index];
    for (const value of values as Photo[]) {
      kv().set(`photo.${value.id}`, await blobToDataUrl(value.blob));
      const at = next.findIndex((item) => item.id === value.id);
      if (at >= 0) next[at] = stripBlob(value);
      else next.push(stripBlob(value));
    }
    kvSet("photos.index", next);
    return;
  }
  const rows = kvGet<{ id: string }[]>(`data.${store}`, []);
  const map = new Map(rows.map((row) => [row.id, row]));
  for (const value of values) map.set((value as { id: string }).id, value as { id: string });
  kvSet(`data.${store}`, [...map.values()]);
}

function stripBlob(photo: Photo): Omit<Photo, "blob"> {
  return {
    id: photo.id,
    name: photo.name,
    mime: photo.mime,
    size: photo.size,
    createdAt: photo.createdAt,
  };
}

export async function deleteRecord(
  store: StoreName,
  id: ID,
  options: { tombstone?: boolean } = {},
) {
  if (options.tombstone !== false) await addTombstones([`${store}:${id}`]);
  const mode = await initStorage();
  if (mode === "indexedDB") {
    const db = await openDatabase();
    await db.delete(store, id);
    return;
  }
  if (store === "photos") {
    kv().remove(`photo.${id}`);
    kvSet(
      "photos.index",
      kvGet<Omit<Photo, "blob">[]>("photos.index", []).filter((item) => item.id !== id),
    );
    return;
  }
  kvSet(
    `data.${store}`,
    kvGet<{ id: string }[]>(`data.${store}`, []).filter((row) => row.id !== id),
  );
}

export async function deleteMany(
  store: StoreName,
  ids: ID[],
  options: { tombstone?: boolean } = {},
) {
  if (!ids.length) return;
  if (options.tombstone !== false) await addTombstones(ids.map((id) => `${store}:${id}`));
  const mode = await initStorage();
  if (mode === "indexedDB") {
    const db = await openDatabase();
    const tx = db.transaction(store, "readwrite");
    await Promise.all([...ids.map((id) => tx.store.delete(id)), tx.done]);
    return;
  }
  const doomed = new Set(ids);
  if (store === "photos") {
    for (const id of ids) kv().remove(`photo.${id}`);
    kvSet(
      "photos.index",
      kvGet<Omit<Photo, "blob">[]>("photos.index", []).filter((item) => !doomed.has(item.id)),
    );
    return;
  }
  kvSet(
    `data.${store}`,
    kvGet<{ id: string }[]>(`data.${store}`, []).filter((row) => !doomed.has(row.id)),
  );
}

export async function clearStores(stores: StoreName[]) {
  const mode = await initStorage();
  /*
   * 清空本地数据前先记墓碑：云端还留着这些记录，
   * 不写墓碑的话下次同步会把它们原样拉回来。
   */
  const now = new Date().toISOString();
  const keys: string[] = [];
  for (const store of stores) {
    if (store === "photos") continue; // 照片按引用同步，不参与记录级墓碑
    for (const id of await listIds(store)) keys.push(`${store}:${id}`);
  }
  /* 走 addTombstones：它是串行的，不会和别处的删除互相覆盖 */
  await addTombstones(keys, now);

  if (mode === "indexedDB") {
    const db = await openDatabase();
    const tx = db.transaction(stores, "readwrite");
    await Promise.all([...stores.map((name) => tx.objectStore(name).clear()), tx.done]);
    return;
  }
  for (const store of stores) {
    if (store === "photos") {
      for (const id of kvGet<Omit<Photo, "blob">[]>("photos.index", []).map((item) => item.id)) {
        kv().remove(`photo.${id}`);
      }
      kv().remove("photos.index");
    } else {
      kv().remove(`data.${store}`);
    }
  }
}

/* --------------------------------- meta ------------------------------- */

export async function getMeta<T>(key: string): Promise<T | undefined> {
  const mode = await initStorage();
  if (mode === "indexedDB") {
    const db = await openDatabase();
    const row = await db.get("meta", key);
    return row?.value as T | undefined;
  }
  return kvGet<T | undefined>(`meta.${key}`, undefined);
}

export async function setMeta(key: string, value: unknown) {
  const mode = await initStorage();
  if (mode === "indexedDB") {
    const db = await openDatabase();
    await db.put("meta", { key, value });
    return;
  }
  kvSet(`meta.${key}`, value);
}

/* ------------------------------ tombstones ---------------------------- */

/**
 * 删除掉的记录要留下"墓碑"，否则另一台设备同步时会把旧数据推回来。
 * 形如 { "events:evt_abc": "2026-09-11T03:00:00.000Z" }
 *
 * 墓碑是「读出来 → 改 → 写回去」，并发调用会互相覆盖：
 * 删除一条带照片的记录时，记录和照片是 Promise.all 一起删的，
 * 两个写入竞争，后写的那个会把前一个的墓碑抹掉 —— 删除动作直接丢失。
 * 所以这里用一条串行队列把写操作排队。
 */
let tombstoneQueue: Promise<unknown> = Promise.resolve();

function serialize<T>(task: () => Promise<T>): Promise<T> {
  const next = tombstoneQueue.then(task, task);
  tombstoneQueue = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

async function readTombstones(): Promise<Record<string, string>> {
  return (await getMeta<Record<string, string>>("tombstones")) ?? {};
}

export async function getTombstones(): Promise<Record<string, string>> {
  return readTombstones();
}

export async function setTombstones(map: Record<string, string>) {
  await serialize(() => setMeta("tombstones", map));
}

export async function addTombstones(keys: string[], at = new Date().toISOString()) {
  if (!keys.length) return;
  await serialize(async () => {
    const map = await readTombstones();
    for (const key of keys) map[key] = at;
    await setMeta("tombstones", map);
  });
}

/** 墓碑不需要永远留着，超过这个时间的可以清掉。 */
export async function pruneTombstones(days = 90) {
  return serialize(async () => {
    const map = await readTombstones();
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const next: Record<string, string> = {};
    for (const [key, at] of Object.entries(map)) {
      if (new Date(at).getTime() >= cutoff) next[key] = at;
    }
    if (Object.keys(next).length !== Object.keys(map).length) {
      await setMeta("tombstones", next);
    }
    return next;
  });
}

/* -------------------------------- photos ------------------------------ */

export async function getPhotoBlob(id: ID): Promise<Blob | undefined> {
  const mode = await initStorage();
  if (mode === "indexedDB") {
    const db = await openDatabase();
    const row = await db.get("photos", id);
    return row?.blob;
  }
  const dataUrl = kv().get(`photo.${id}`);
  if (!dataUrl) return undefined;
  try {
    return await dataUrlToBlob(dataUrl);
  } catch {
    return undefined;
  }
}

/* -------------------------------- reset ------------------------------- */

export async function resetDatabase() {
  await clearStores([...DATA_STORES, "photos"]);
}

let lastUsage: { usage: number; quota: number } | null = null;
let lastSample = 0;

export async function estimateUsage(): Promise<{ usage: number; quota: number } | null> {
  const mode = await initStorage();
  const now = Date.now();
  if (mode === "indexedDB") {
    if (!navigator.storage?.estimate) return null;
    if (now - lastSample < 3000) return lastUsage;
    const { usage = 0, quota = 0 } = await navigator.storage.estimate();
    lastSample = now;
    lastUsage = { usage, quota };
    return lastUsage;
  }
  if (mode === "memory") return { usage: 0, quota: 0 };
  let usage = 0;
  const store = kv();
  for (const key of store.keys()) usage += (store.get(key)?.length ?? 0) * 2;
  /* localStorage 通常给到 5MB 左右 */
  return { usage, quota: 5 * 1024 * 1024 };
}
