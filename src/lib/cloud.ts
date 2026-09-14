import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";
import { safeParse } from "./utils";

/**
 * 云同步的连接信息存在本地（localStorage），每个设备填一次。
 * 也可以在构建时通过 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 注入默认值，
 * 这样新设备打开就能直接登录，不用手输。
 */

const CONFIG_KEY = "lifeledger.cloud.v1";

export interface CloudConfig {
  url: string;
  key: string;
}

const envUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

function normalize(config: CloudConfig): CloudConfig {
  return {
    url: config.url.trim().replace(/\/+$/, ""),
    key: config.key.trim(),
  };
}

export function loadCloudConfig(): CloudConfig | null {
  if (typeof localStorage !== "undefined") {
    const raw = localStorage.getItem(CONFIG_KEY);
    const parsed = raw ? safeParse<CloudConfig>(raw) : null;
    if (parsed?.url && parsed.key) return normalize(parsed);
  }
  if (envUrl && envKey) return normalize({ url: envUrl, key: envKey });
  return null;
}

export function saveCloudConfig(config: CloudConfig | null) {
  try {
    if (config) localStorage.setItem(CONFIG_KEY, JSON.stringify(normalize(config)));
    else localStorage.removeItem(CONFIG_KEY);
  } catch {
    /* 存不下就算了，本次会话仍然可用 */
  }
  client = null;
}

let client: SupabaseClient | null = null;

export function getClient(): SupabaseClient | null {
  const config = loadCloudConfig();
  if (!config) return null;
  if (!client) {
    client = createClient(config.url, config.key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storageKey: "lifeledger.auth.v1",
        /* 明确用 localStorage 保存登录状态；拿不到就不保存，避免静默丢登录 */
        storage: typeof localStorage === "undefined" ? undefined : localStorage,
      },
    });
  }
  return client;
}

export function isCloudConfigured() {
  return loadCloudConfig() !== null;
}

/** 把校验后的地址补全，容错用户误把控制台地址粘进来。 */
export function normalizeProjectUrl(input: string): string {
  const trimmed = input.trim().replace(/\/+$/, "");
  const match = trimmed.match(/https?:\/\/([a-z0-9-]+)\.supabase\.co/i);
  if (match) return `https://${match[1]}.supabase.co`;
  return trimmed;
}

export async function getSession(): Promise<Session | null> {
  const supabase = getClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session ?? null;
}

export function onAuthChange(callback: (session: Session | null) => void) {
  const supabase = getClient();
  if (!supabase) return () => undefined;
  const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session));
  return () => data.subscription.unsubscribe();
}

export async function signUp(email: string, password: string) {
  const supabase = getClient();
  if (!supabase) throw new Error("还没有配置 Supabase 连接信息。");
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw new Error(translate(error.message));
  return data;
}

export async function signIn(email: string, password: string) {
  const supabase = getClient();
  if (!supabase) throw new Error("还没有配置 Supabase 连接信息。");
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(translate(error.message));
  return data;
}

export async function signOut() {
  const supabase = getClient();
  if (!supabase) return;
  await supabase.auth.signOut();
}

function translate(message: string): string {
  const map: [RegExp, string][] = [
    [/Invalid login credentials/i, "邮箱或密码不对。"],
    [/Email not confirmed/i, "邮箱还没确认。去邮箱点一下确认链接，或在 Supabase 里关掉 Confirm email。"],
    [/User already registered/i, "这个邮箱已经注册过了，直接登录就行。"],
    [/Password should be at least/i, "密码太短了，至少要 6 位。"],
    [/Unable to validate email address/i, "邮箱格式看起来不对。"],
    [/Failed to fetch|NetworkError/i, "连不上 Supabase，检查一下网络或项目地址。"],
    [/Invalid API key|JWT/i, "anon key 不对，检查一下复制完整了没有。"],
  ];
  for (const [pattern, text] of map) if (pattern.test(message)) return text;
  return message;
}

export const PHOTO_BUCKET = "ll-photos";
export const ITEMS_TABLE = "ll_items";
