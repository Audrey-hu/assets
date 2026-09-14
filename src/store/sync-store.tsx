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
import type { Session } from "@supabase/supabase-js";
import {
  getSession,
  isCloudConfigured,
  loadCloudConfig,
  normalizeProjectUrl,
  onAuthChange,
  saveCloudConfig,
  signIn as cloudSignIn,
  signOut as cloudSignOut,
  signUp as cloudSignUp,
  type CloudConfig,
} from "@/lib/cloud";
import { runSync, type SyncStats } from "@/lib/sync";
import { useApp } from "./app-store";

const LAST_SYNC_KEY = "lifeledger.cloud.lastSync";
const AUTO_KEY = "lifeledger.cloud.auto";

export type SyncStatus = "off" | "idle" | "syncing" | "error";

interface SyncContextValue {
  configured: boolean;
  config: CloudConfig | null;
  session: Session | null;
  /** 正在从本地恢复登录状态（避免刚打开就闪出登录表单） */
  restoring: boolean;
  status: SyncStatus;
  progress: string;
  error: string | null;
  lastSync: string | null;
  lastStats: SyncStats | null;
  autoSync: boolean;
  setAutoSync: (value: boolean) => void;
  configure: (url: string, key: string) => void;
  disconnect: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  syncNow: (reason?: "manual" | "auto") => Promise<void>;
  pairLink: () => string;
}

const SyncContext = createContext<SyncContextValue | null>(null);

export function SyncProvider({ children }: { children: ReactNode }) {
  const { revision, isPristineDemo, reload, notify } = useApp();
  const [config, setConfig] = useState<CloudConfig | null>(() => loadCloudConfig());
  const [session, setSession] = useState<Session | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [status, setStatus] = useState<SyncStatus>(() =>
    loadCloudConfig() ? "idle" : "off",
  );
  const [progress, setProgress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(() => {
    try {
      return localStorage.getItem(LAST_SYNC_KEY);
    } catch {
      return null;
    }
  });
  const [lastStats, setLastStats] = useState<SyncStats | null>(null);
  const [autoSync, setAutoSyncState] = useState(() => {
    try {
      return localStorage.getItem(AUTO_KEY) !== "0";
    } catch {
      return true;
    }
  });

  const running = useRef(false);
  /* 同步结束会触发一次数据刷新，用它避开"自己触发自己"的循环 */
  const appliedAt = useRef(0);
  const lastSyncRef = useRef(lastSync);
  lastSyncRef.current = lastSync;

  const setAutoSync = useCallback((value: boolean) => {
    setAutoSyncState(value);
    try {
      localStorage.setItem(AUTO_KEY, value ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, []);

  /* ---------------------------- 登录状态 ---------------------------- */

  useEffect(() => {
    if (!config) {
      setSession(null);
      setStatus("off");
      setRestoring(false);
      return;
    }
    let active = true;
    getSession().then((current) => {
      if (!active) return;
      setSession(current);
      setStatus(current ? "idle" : "off");
      setRestoring(false);
    });
    const off = onAuthChange((next) => {
      if (!active) return;
      setSession(next);
      setStatus(next ? "idle" : "off");
      setRestoring(false);
    });
    return () => {
      active = false;
      off();
    };
  }, [config]);

  /* ------------------------------ 同步 ------------------------------ */

  const syncNow = useCallback<SyncContextValue["syncNow"]>(
    async (reason = "manual") => {
      if (running.current) return;
      if (!isCloudConfigured()) return;
      const current = await getSession();
      if (!current) return;
      running.current = true;
      setStatus("syncing");
      setError(null);
      setProgress("准备中…");
      try {
        const stats = await runSync(setProgress, {
          firstSync: !lastSyncRef.current,
          dropLocalExtras: isPristineDemo(),
        });
        appliedAt.current = Date.now();
        await reload();
        const finished = stats.finishedAt;
        setLastSync(finished);
        setLastStats(stats);
        try {
          localStorage.setItem(LAST_SYNC_KEY, finished);
        } catch {
          /* ignore */
        }
        setStatus("idle");
        setProgress("");
        if (reason === "manual") {
          const bits = [
            stats.pushed ? `上传 ${stats.pushed}` : "",
            stats.pulled ? `下载 ${stats.pulled}` : "",
            stats.deletedLocal ? `删除 ${stats.deletedLocal}` : "",
            stats.photosUp + stats.photosDown
              ? `照片 ${stats.photosUp + stats.photosDown}`
              : "",
          ].filter(Boolean);
          notify(bits.length ? `同步完成 · ${bits.join(" · ")}` : "已是最新", "success");
        }
      } catch (caught) {
        const text = caught instanceof Error ? caught.message : "同步失败";
        setStatus("error");
        setError(text);
        setProgress("");
        if (reason === "manual") notify(text);
      } finally {
        running.current = false;
      }
    },
    [reload, notify, isPristineDemo],
  );

  /* 首次连上就同步一次 */
  useEffect(() => {
    if (!session || !autoSync) return;
    if (lastSyncRef.current) return;
    void syncNow("auto");
  }, [session, autoSync, syncNow]);

  /* 用户一有改动，安静地推一次（防抖 4 秒） */
  useEffect(() => {
    if (!session || !autoSync) return;
    if (revision === 0) return; // 还没有任何用户改动
    if (Date.now() - appliedAt.current < 2000) return; // 刚同步完的刷新
    const timer = window.setTimeout(() => void syncNow("auto"), 4000);
    return () => window.clearTimeout(timer);
  }, [revision, session, autoSync, syncNow]);

  /* 回到前台时，如果超过 1 分钟没同步就补一次 */
  useEffect(() => {
    if (!session || !autoSync) return;
    const maybeSync = () => {
      if (document.visibilityState === "hidden") return;
      const last = lastSyncRef.current ? new Date(lastSyncRef.current).getTime() : 0;
      if (Date.now() - last > 60_000) void syncNow("auto");
    };
    window.addEventListener("focus", maybeSync);
    document.addEventListener("visibilitychange", maybeSync);
    return () => {
      window.removeEventListener("focus", maybeSync);
      document.removeEventListener("visibilitychange", maybeSync);
    };
  }, [session, autoSync, syncNow]);

  /* ------------------------------ 操作 ------------------------------ */

  const configure = useCallback((url: string, key: string) => {
    const next = { url: normalizeProjectUrl(url), key: key.trim() };
    saveCloudConfig(next);
    setConfig(next);
    setError(null);
  }, []);

  const disconnect = useCallback(async () => {
    await cloudSignOut().catch(() => undefined);
    saveCloudConfig(null);
    setConfig(null);
    setSession(null);
    setStatus("off");
    setLastSync(null);
    setLastStats(null);
    try {
      localStorage.removeItem(LAST_SYNC_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    await cloudSignIn(email, password);
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const result = await cloudSignUp(email, password);
    if (!result.session) {
      throw new Error("注册成功，但需要先确认邮箱。去邮箱点一下链接，或到 Supabase 关掉 Confirm email。");
    }
  }, []);

  const signOut = useCallback(async () => {
    await cloudSignOut();
    setSession(null);
    setStatus("off");
  }, []);

  const pairLink = useCallback(() => {
    if (!config) return "";
    const payload = btoa(unescape(encodeURIComponent(JSON.stringify(config))));
    const base = `${location.origin}${location.pathname}`;
    return `${base}?cloud=${encodeURIComponent(payload)}#/me`;
  }, [config]);

  /* 用配对链接打开时自动填好连接信息 */
  useEffect(() => {
    if (typeof location === "undefined") return;
    const raw = new URLSearchParams(location.search).get("cloud");
    if (!raw) return;
    try {
      const parsed = JSON.parse(decodeURIComponent(escape(atob(raw)))) as CloudConfig;
      if (parsed?.url && parsed?.key) configure(parsed.url, parsed.key);
      notify("连接信息已填好，用同一个邮箱登录就能看到你的数据", "success");
    } catch {
      /* 链接坏了就当没看见 */
    }
    const url = new URL(location.href);
    url.searchParams.delete("cloud");
    window.history.replaceState(null, "", url.toString());
  }, [configure, notify]);

  const value = useMemo<SyncContextValue>(
    () => ({
      configured: Boolean(config),
      config,
      session,
      restoring,
      status,
      progress,
      error,
      lastSync,
      lastStats,
      autoSync,
      setAutoSync,
      configure,
      disconnect,
      signIn,
      signUp,
      signOut,
      syncNow,
      pairLink,
    }),
    [
      config,
      session,
      restoring,
      status,
      progress,
      error,
      lastSync,
      lastStats,
      autoSync,
      setAutoSync,
      configure,
      disconnect,
      signIn,
      signUp,
      signOut,
      syncNow,
      pairLink,
    ],
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync() {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error("useSync must be used inside SyncProvider");
  return ctx;
}
