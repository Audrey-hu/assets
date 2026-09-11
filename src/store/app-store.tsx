import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  backendLabel,
  clearStores,
  deleteMany,
  deleteRecord,
  getAll,
  getBackend,
  getMeta,
  putMany,
  putRecord,
  setMeta,
  getPhotoBlob,
  type Backend,
} from "@/lib/db";
import { compressImage } from "@/lib/media";
import { applyTheme, defaultSettings, loadSettings, saveSettings } from "@/lib/settings";
import { buildDemoData, storeDemoPhotos } from "@/lib/seed";
import type { Dataset } from "@/lib/stats";
import type {
  Asset,
  Course,
  Hobby,
  ID,
  IncomeProject,
  Journey,
  LifeEvent,
  SavingsItem,
  SavingsTx,
  Settings,
  Stage,
} from "@/lib/types";
import { uid } from "@/lib/utils";

const EMPTY: Dataset = {
  hobbies: [],
  journeys: [],
  stages: [],
  events: [],
  courses: [],
  incomes: [],
  assets: [],
  savings: [],
  savingsTx: [],
  snapshots: [],
};

export interface Toast {
  id: string;
  message: string;
  tone?: "default" | "success";
}

interface AppContextValue {
  ready: boolean;
  data: Dataset;
  settings: Settings;
  storage: { backend: Backend; label: string } | null;
  updateSettings: (patch: Partial<Settings>) => void;
  toasts: Toast[];
  notify: (message: string, tone?: Toast["tone"]) => void;
  dismissToast: (id: string) => void;

  saveHobby: (hobby: Hobby) => Promise<void>;
  deleteHobby: (id: ID) => Promise<void>;
  saveJourney: (journey: Journey) => Promise<void>;
  deleteJourney: (id: ID) => Promise<void>;
  saveStage: (stage: Stage) => Promise<void>;
  deleteStage: (id: ID) => Promise<void>;
  saveEvent: (event: LifeEvent, options?: { silent?: boolean }) => Promise<void>;
  deleteEvent: (id: ID) => Promise<void>;
  saveCourse: (course: Course) => Promise<void>;
  deleteCourse: (id: ID) => Promise<void>;
  saveIncome: (income: IncomeProject) => Promise<void>;
  deleteIncome: (id: ID) => Promise<void>;
  saveAsset: (asset: Asset) => Promise<void>;
  deleteAsset: (id: ID) => Promise<void>;
  saveSavings: (item: SavingsItem) => Promise<void>;
  deleteSavings: (id: ID) => Promise<void>;
  saveSavingsTx: (tx: SavingsTx) => Promise<void>;
  deleteSavingsTx: (id: ID) => Promise<void>;

  addPhotos: (files: File[], ownerEventId?: ID) => Promise<ID[]>;
  deletePhotos: (ids: ID[]) => Promise<void>;

  clearDemoData: () => Promise<void>;
  loadDemoData: () => Promise<void>;
  reload: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Dataset>(EMPTY);
  const [ready, setReady] = useState(false);
  const [storage, setStorage] = useState<AppContextValue["storage"]>(null);
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<string, number>>(new Map());

  const notify = useCallback((message: string, tone: Toast["tone"] = "default") => {
    const id = uid("toast");
    setToasts((prev) => [...prev.slice(-2), { id, message, tone }]);
    const handle = window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      timers.current.delete(id);
    }, 2800);
    timers.current.set(id, handle);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const handle = timers.current.get(id);
    if (handle) window.clearTimeout(handle);
  }, []);

  const load = useCallback(async () => {
    const [hobbies, journeys, stages, events, courses, incomes, assets, savings, savingsTx, snapshots] =
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
      ]);
    return { hobbies, journeys, stages, events, courses, incomes, assets, savings, savingsTx, snapshots };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const mode = await getBackend();
      if (!cancelled) setStorage({ backend: mode, label: backendLabel(mode) });
      let next = await load();
      const isEmpty = next.hobbies.length === 0 && next.journeys.length === 0 && next.events.length === 0;
      /*
       * 「是否已经初始化过」的标记必须和存数据的后端放在一起。
       * 否则从 IndexedDB 切到本地存储（或反过来）时，标记还在、数据没了，
       * 用户会看到一个永远空白的应用。
       */
      const seeded = await getMeta<boolean>("seeded");
      if (isEmpty && !seeded) {
        const demo = buildDemoData();
        await Promise.all([
          putMany("hobbies", demo.hobbies),
          putMany("journeys", demo.journeys),
          putMany("stages", demo.stages),
          putMany("events", demo.events),
          putMany("courses", demo.courses),
          putMany("incomes", demo.incomes),
          putMany("assets", demo.assets),
          putMany("savings", demo.savings),
          putMany("savingsTx", demo.savingsTx),
          putMany("snapshots", demo.snapshots),
        ]);
        await setMeta("seeded", true);
        await storeDemoPhotos();
        if (!cancelled) setSettings((prev) => ({ ...prev, demoSeeded: true }));
        next = demo;
      }
      if (cancelled) return;
      setData(next);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  useEffect(() => {
    applyTheme(settings.theme);
    saveSettings(settings);
  }, [settings]);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const reload = useCallback(async () => {
    const next = await load();
    setData(next);
  }, [load]);

  const patchDataset = useCallback((patch: Partial<Dataset>) => {
    setData((prev) => ({ ...prev, ...patch }));
  }, []);

  /* ------------------------------ hobbies ------------------------------ */

  const saveHobby = useCallback(
    async (hobby: Hobby) => {
      const next = { ...hobby, updatedAt: new Date().toISOString() };
      await putRecord("hobbies", next);
      setData((prev) => {
        const exists = prev.hobbies.some((h) => h.id === next.id);
        return {
          ...prev,
          hobbies: exists ? prev.hobbies.map((h) => (h.id === next.id ? next : h)) : [...prev.hobbies, next],
        };
      });
    },
    [],
  );

  const deleteHobby = useCallback(
    async (id: ID) => {
      const doomedEvents = data.events.filter((e) => e.hobbyId === id);
      const doomedCourses = data.courses.filter((c) => c.hobbyId === id);
      const photoIds = doomedEvents.flatMap((e) => e.photoIds ?? []);
      const orphanAssets = data.assets.filter((a) => a.sourceHobbyId === id);
      await Promise.all([
        deleteRecord("hobbies", id),
        deleteMany("events", doomedEvents.map((e) => e.id)),
        deleteMany("courses", doomedCourses.map((c) => c.id)),
        deleteMany("photos", photoIds),
        ...orphanAssets.map((a) => putRecord("assets", { ...a, sourceHobbyId: undefined })),
      ]);
      patchDataset({
        hobbies: data.hobbies.filter((h) => h.id !== id),
        events: data.events.filter((e) => e.hobbyId !== id),
        courses: data.courses.filter((c) => c.hobbyId !== id),
        assets: data.assets.map((a) => (a.sourceHobbyId === id ? { ...a, sourceHobbyId: undefined } : a)),
      });
    },
    [data, patchDataset],
  );

  /* ------------------------------ journeys ----------------------------- */

  const saveJourney = useCallback(async (journey: Journey) => {
    const next = { ...journey, updatedAt: new Date().toISOString() };
    await putRecord("journeys", next);
    setData((prev) => {
      const exists = prev.journeys.some((j) => j.id === next.id);
      return {
        ...prev,
        journeys: exists
          ? prev.journeys.map((j) => (j.id === next.id ? next : j))
          : [...prev.journeys, next],
      };
    });
  }, []);

  const deleteJourney = useCallback(
    async (id: ID) => {
      const doomedEvents = data.events.filter((e) => e.journeyId === id);
      const doomedStages = data.stages.filter((s) => s.journeyId === id);
      const photoIds = doomedEvents.flatMap((e) => e.photoIds ?? []);
      const orphanAssets = data.assets.filter((a) => a.sourceJourneyId === id);
      const orphanIncomes = data.incomes.filter((i) => i.journeyId === id);
      await Promise.all([
        deleteRecord("journeys", id),
        deleteMany("events", doomedEvents.map((e) => e.id)),
        deleteMany("stages", doomedStages.map((s) => s.id)),
        deleteMany("photos", photoIds),
        ...orphanAssets.map((a) => putRecord("assets", { ...a, sourceJourneyId: undefined })),
        ...orphanIncomes.map((i) => putRecord("incomes", { ...i, journeyId: undefined })),
      ]);
      patchDataset({
        journeys: data.journeys.filter((j) => j.id !== id),
        events: data.events.filter((e) => e.journeyId !== id),
        stages: data.stages.filter((s) => s.journeyId !== id),
        assets: data.assets.map((a) => (a.sourceJourneyId === id ? { ...a, sourceJourneyId: undefined } : a)),
        incomes: data.incomes.map((i) => (i.journeyId === id ? { ...i, journeyId: undefined } : i)),
      });
    },
    [data, patchDataset],
  );

  const saveStage = useCallback(async (stage: Stage) => {
    const next = { ...stage, updatedAt: new Date().toISOString() };
    await putRecord("stages", next);
    setData((prev) => {
      const exists = prev.stages.some((s) => s.id === next.id);
      return {
        ...prev,
        stages: exists ? prev.stages.map((s) => (s.id === next.id ? next : s)) : [...prev.stages, next],
      };
    });
  }, []);

  const deleteStage = useCallback(async (id: ID) => {
    await deleteRecord("stages", id);
    setData((prev) => ({
      ...prev,
      stages: prev.stages.filter((s) => s.id !== id),
      events: prev.events.map((e) => (e.stageId === id ? { ...e, stageId: undefined } : e)),
    }));
  }, []);

  /* ------------------------------- events ------------------------------ */

  const saveEvent = useCallback(
    async (event: LifeEvent, options?: { silent?: boolean }) => {
      const next = { ...event, updatedAt: new Date().toISOString() };
      await putRecord("events", next);
      setData((prev) => {
        const exists = prev.events.some((e) => e.id === next.id);
        const events = exists ? prev.events.map((e) => (e.id === next.id ? next : e)) : [...prev.events, next];
        return { ...prev, events };
      });
      if (!options?.silent) notify("已保存", "success");
    },
    [notify],
  );

  const deleteEvent = useCallback(
    async (id: ID) => {
      const target = data.events.find((e) => e.id === id);
      await Promise.all([
        deleteRecord("events", id),
        deleteMany("photos", target?.photoIds ?? []),
      ]);
      setData((prev) => ({ ...prev, events: prev.events.filter((e) => e.id !== id) }));
      notify("已删除记录");
    },
    [data.events, notify],
  );

  /* ------------------------------ courses ------------------------------ */

  const saveCourse = useCallback(async (course: Course) => {
    const next = { ...course, updatedAt: new Date().toISOString() };
    await putRecord("courses", next);
    setData((prev) => {
      const exists = prev.courses.some((c) => c.id === next.id);
      return {
        ...prev,
        courses: exists ? prev.courses.map((c) => (c.id === next.id ? next : c)) : [...prev.courses, next],
      };
    });
  }, []);

  const deleteCourse = useCallback(async (id: ID) => {
    await deleteRecord("courses", id);
    setData((prev) => ({
      ...prev,
      courses: prev.courses.filter((c) => c.id !== id),
      events: prev.events.map((e) => (e.courseId === id ? { ...e, courseId: undefined } : e)),
    }));
  }, []);

  /* ------------------------------ incomes ------------------------------ */

  const saveIncome = useCallback(async (income: IncomeProject) => {
    const next = { ...income, updatedAt: new Date().toISOString() };
    await putRecord("incomes", next);
    setData((prev) => {
      const exists = prev.incomes.some((i) => i.id === next.id);
      return {
        ...prev,
        incomes: exists ? prev.incomes.map((i) => (i.id === next.id ? next : i)) : [...prev.incomes, next],
      };
    });
  }, []);

  const deleteIncome = useCallback(async (id: ID) => {
    await deleteRecord("incomes", id);
    setData((prev) => ({
      ...prev,
      incomes: prev.incomes.filter((i) => i.id !== id),
      assets: prev.assets.map((a) => (a.sourceIncomeId === id ? { ...a, sourceIncomeId: undefined } : a)),
    }));
  }, []);

  /* ------------------------------- assets ------------------------------ */

  const saveAsset = useCallback(async (asset: Asset) => {
    const next = { ...asset, updatedAt: new Date().toISOString() };
    await putRecord("assets", next);
    setData((prev) => {
      const exists = prev.assets.some((a) => a.id === next.id);
      return {
        ...prev,
        assets: exists ? prev.assets.map((a) => (a.id === next.id ? next : a)) : [...prev.assets, next],
      };
    });
  }, []);

  const deleteAsset = useCallback(
    async (id: ID) => {
      const target = data.assets.find((a) => a.id === id);
      await Promise.all([
        deleteRecord("assets", id),
        deleteMany("photos", target?.photoIds ?? []),
        ...data.incomes.filter((i) => i.assetId === id).map((i) => putRecord("incomes", { ...i, assetId: undefined })),
      ]);
      setData((prev) => ({
        ...prev,
        assets: prev.assets.filter((a) => a.id !== id),
        incomes: prev.incomes.map((i) => (i.assetId === id ? { ...i, assetId: undefined } : i)),
      }));
    },
    [data.assets, data.incomes],
  );

  /* ------------------------------ savings ------------------------------ */

  const saveSavings = useCallback(async (item: SavingsItem) => {
    const next = { ...item, updatedAt: new Date().toISOString() };
    await putRecord("savings", next);
    setData((prev) => {
      const exists = prev.savings.some((s) => s.id === next.id);
      return {
        ...prev,
        savings: exists ? prev.savings.map((s) => (s.id === next.id ? next : s)) : [...prev.savings, next],
      };
    });
  }, []);

  const deleteSavings = useCallback(
    async (id: ID) => {
      await Promise.all([
        deleteRecord("savings", id),
        deleteMany("savingsTx", data.savingsTx.filter((t) => t.itemId === id).map((t) => t.id)),
      ]);
      setData((prev) => ({
        ...prev,
        savings: prev.savings.filter((s) => s.id !== id),
        savingsTx: prev.savingsTx.filter((t) => t.itemId !== id),
      }));
    },
    [data.savingsTx],
  );

  const saveSavingsTx = useCallback(
    async (tx: SavingsTx) => {
      await putRecord("savingsTx", tx);
      setData((prev) => ({ ...prev, savingsTx: [...prev.savingsTx.filter((t) => t.id !== tx.id), tx] }));
    },
    [],
  );

  const deleteSavingsTx = useCallback(async (id: ID) => {
    await deleteRecord("savingsTx", id);
    setData((prev) => ({ ...prev, savingsTx: prev.savingsTx.filter((t) => t.id !== id) }));
  }, []);

  /* ------------------------------- photos ------------------------------ */

  const addPhotos = useCallback(async (files: File[]) => {
    const mode = await getBackend();
    /* 本地存储容量小，图片再压小一点 */
    const maxSize = mode === "indexedDB" ? 1600 : 1024;
    const quality = mode === "indexedDB" ? 0.82 : 0.72;
    const ids: ID[] = [];
    const records = [];
    for (const file of files.slice(0, 6)) {
      const id = uid("photo");
      const blob = await compressImage(file, maxSize, quality);
      ids.push(id);
      records.push({
        id,
        blob,
        name: file.name || "photo.jpg",
        mime: blob.type || "image/jpeg",
        size: blob.size,
        createdAt: new Date().toISOString(),
      });
    }
    try {
      await putMany("photos", records);
    } catch {
      notify("照片没有保存成功：设备存储空间可能不够了。");
      return [];
    }
    return ids;
  }, [notify]);

  const deletePhotos = useCallback(async (ids: ID[]) => {
    await deleteMany("photos", ids);
  }, []);

  /* ------------------------------- reset ------------------------------- */

  const clearDemoData = useCallback(async () => {
    await clearStores([
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
      "photos",
    ]);
    /* 清空之后要留下「已初始化」的标记，否则刷新又会自动灌一次示例数据 */
    await setMeta("seeded", true);
    setData(EMPTY);
    updateSettings({ demoSeeded: true });
    notify("示例数据已清空");
  }, [notify, updateSettings]);

  const loadDemoData = useCallback(async () => {
    const demo = buildDemoData();
    await Promise.all([
      putMany("hobbies", demo.hobbies),
      putMany("journeys", demo.journeys),
      putMany("stages", demo.stages),
      putMany("events", demo.events),
      putMany("courses", demo.courses),
      putMany("incomes", demo.incomes),
      putMany("assets", demo.assets),
      putMany("savings", demo.savings),
      putMany("savingsTx", demo.savingsTx),
      putMany("snapshots", demo.snapshots),
    ]);
    setData(demo);
    notify("示例数据已载入", "success");
    await storeDemoPhotos();
  }, [notify]);

  const value = useMemo<AppContextValue>(
    () => ({
      ready,
      data,
      settings,
      storage,
      updateSettings,
      toasts,
      notify,
      dismissToast,
      saveHobby,
      deleteHobby,
      saveJourney,
      deleteJourney,
      saveStage,
      deleteStage,
      saveEvent,
      deleteEvent,
      saveCourse,
      deleteCourse,
      saveIncome,
      deleteIncome,
      saveAsset,
      deleteAsset,
      saveSavings,
      deleteSavings,
      saveSavingsTx,
      deleteSavingsTx,
      addPhotos,
      deletePhotos,
      clearDemoData,
      loadDemoData,
      reload,
    }),
    [
      ready,
      data,
      settings,
      storage,
      updateSettings,
      toasts,
      notify,
      dismissToast,
      saveHobby,
      deleteHobby,
      saveJourney,
      deleteJourney,
      saveStage,
      deleteStage,
      saveEvent,
      deleteEvent,
      saveCourse,
      deleteCourse,
      saveIncome,
      deleteIncome,
      saveAsset,
      deleteAsset,
      saveSavings,
      deleteSavings,
      saveSavingsTx,
      deleteSavingsTx,
      addPhotos,
      deletePhotos,
      clearDemoData,
      loadDemoData,
      reload,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}

/* --------------------------- photo url cache --------------------------- */

const urlCache = new Map<ID, string>();
const pendingLoads = new Map<ID, Promise<string | undefined>>();
const missingPhotos = new Set<ID>();

async function resolvePhotoUrl(id: ID): Promise<string | undefined> {
  const cached = urlCache.get(id);
  if (cached) return cached;
  if (missingPhotos.has(id)) return undefined;
  const inflight = pendingLoads.get(id);
  if (inflight) return inflight;
  const promise = (async () => {
    const blob = await getPhotoBlob(id);
    if (!blob) {
      missingPhotos.add(id);
      return undefined;
    }
    const url = URL.createObjectURL(blob);
    urlCache.set(id, url);
    return url;
  })();
  pendingLoads.set(id, promise);
  const result = await promise;
  pendingLoads.delete(id);
  return result;
}

export function usePhotoUrl(id?: ID) {
  const [url, setUrl] = useState<string | undefined>(() => (id ? urlCache.get(id) : undefined));
  const [missing, setMissing] = useState(() => Boolean(id && missingPhotos.has(id)));
  useEffect(() => {
    let active = true;
    if (!id) {
      setUrl(undefined);
      setMissing(false);
      return;
    }
    if (missingPhotos.has(id)) {
      setMissing(true);
      setUrl(undefined);
      return;
    }
    const cached = urlCache.get(id);
    if (cached) {
      setUrl(cached);
      setMissing(false);
      return;
    }
    resolvePhotoUrl(id).then((res) => {
      if (!active) return;
      if (res) {
        setUrl(res);
        setMissing(false);
      } else {
        setMissing(true);
      }
    });
    return () => {
      active = false;
    };
  }, [id]);
  return { url, missing };
}

export async function exportPhotoBlob(id: ID) {
  return getPhotoBlob(id);
}

export { defaultSettings };
