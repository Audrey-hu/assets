import { useState } from "react";
import {
  Check,
  Cloud,
  CloudOff,
  Copy,
  Link2,
  Loader2,
  LogOut,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, KeyValue, SectionHeader } from "@/components/ui/display";
import { Field, Input, Switch } from "@/components/ui/form";
import { useSync } from "@/store/sync-store";
import { useApp } from "@/store/app-store";
import { useUI } from "@/store/ui-store";
import { fmtDate, fmtTimeRange } from "@/lib/format";
import { cn } from "@/lib/utils";

export function CloudSyncSection() {
  const {
    configured,
    config,
    session,
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
  } = useSync();
  const { askConfirm } = useUI();
  const { notify } = useApp();

  const [url, setUrl] = useState(config?.url ?? "");
  const [key, setKey] = useState(config?.key ?? "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<"none" | "signin" | "signup" | "sync">("none");
  const [localError, setLocalError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleAuth(kind: "signin" | "signup") {
    setLocalError(null);
    setBusy(kind);
    try {
      if (kind === "signin") await signIn(email.trim(), password);
      else await signUp(email.trim(), password);
      setPassword("");
      await syncNow("manual");
    } catch (caught) {
      setLocalError(caught instanceof Error ? caught.message : "操作失败");
    } finally {
      setBusy("none");
    }
  }

  const syncLabel =
    status === "syncing"
      ? progress || "同步中…"
      : lastSync
        ? `上次同步 ${fmtDate(lastSync.slice(0, 10))} ${fmtTimeRange(lastSync.slice(11, 16))}`
        : "还没有同步过";

  return (
    <section className="pt-7">
      <SectionHeader
        title="云同步"
        hint={configured ? (session ? session.user.email ?? "" : "已配置，尚未登录") : "让手机和电脑看到同一份数据"}
        action={
          configured && session ? (
            <Button
              size="pill"
              variant="outline"
              disabled={status === "syncing"}
              onClick={() => syncNow("manual")}
            >
              {status === "syncing" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <RefreshCw className="size-3.5" />
              )}
              立即同步
            </Button>
          ) : undefined
        }
      />

      <Card className="p-5">
        {!configured ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-secondary text-muted-foreground">
                <Cloud className="size-4" />
              </span>
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                填入你自己的 Supabase 项目信息即可开启同步。数据存在你的账号下，
                用邮箱登录，其他人看不到。
                <br />
                具体步骤见仓库里的 <span className="text-foreground/80">supabase/README.md</span>。
              </p>
            </div>
            <Field label="Project URL" hint="形如 https://xxxx.supabase.co">
              <Input
                value={url}
                placeholder="https://xxxxxxxx.supabase.co"
                autoComplete="off"
                onChange={(event) => setUrl(event.target.value)}
              />
            </Field>
            <Field label="anon public key" hint="Settings → API 里那条 anon 开头的">
              <Input
                value={key}
                placeholder="eyJhbGciOi..."
                autoComplete="off"
                onChange={(event) => setKey(event.target.value)}
              />
            </Field>
            <Button
              size="lg"
              disabled={!url.trim() || !key.trim()}
              onClick={() => {
                configure(url, key);
                notify("连接信息已保存", "success");
              }}
            >
              保存并继续
            </Button>
          </div>
        ) : !session ? (
          <div className="space-y-4">
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              用邮箱注册一个账号。第一次注册后，其它设备用同一个邮箱登录就能看到同一份数据。
            </p>
            <Field label="邮箱">
              <Input
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </Field>
            <Field label="密码" hint="至少 6 位">
              <Input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button
                size="lg"
                disabled={busy !== "none" || !email.trim() || password.length < 6}
                onClick={() => handleAuth("signin")}
              >
                {busy === "signin" && <Loader2 className="size-4 animate-spin" />}
                登录
              </Button>
              <Button
                size="lg"
                variant="outline"
                disabled={busy !== "none" || !email.trim() || password.length < 6}
                onClick={() => handleAuth("signup")}
              >
                {busy === "signup" && <Loader2 className="size-4 animate-spin" />}
                注册
              </Button>
              <Button
                size="lg"
                variant="ghost"
                className="text-muted-foreground"
                onClick={() =>
                  askConfirm({
                    title: "断开云同步？",
                    description: "只会清除这台设备上的连接信息，本地数据和云端数据都不会删除。",
                    confirmLabel: "断开",
                    onConfirm: disconnect,
                  })
                }
              >
                断开
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 pb-3">
              <span
                className={cn(
                  "grid size-9 place-items-center rounded-lg",
                  status === "error"
                    ? "bg-destructive/10 text-destructive"
                    : "bg-primary/10 text-primary",
                )}
              >
                {status === "error" ? <CloudOff className="size-4" /> : <Cloud className="size-4" />}
              </span>
              <div className="min-w-0">
                <div className="truncate text-[14px] font-medium text-foreground">
                  {session.user.email}
                </div>
                <div className="text-[12px] text-muted-foreground">{syncLabel}</div>
              </div>
            </div>

            <div className="divide-y divide-border/70 border-t border-border/70">
              {lastStats && (
                <KeyValue
                  label="上次结果"
                  value={`↑${lastStats.pushed} ↓${lastStats.pulled}${
                    lastStats.photosUp + lastStats.photosDown
                      ? ` · 照片 ${lastStats.photosUp + lastStats.photosDown}`
                      : ""
                  }`}
                />
              )}
              <div className="py-3">
                <Switch
                  checked={autoSync}
                  onCheckedChange={setAutoSync}
                  label="自动同步"
                  description="每次改动后自动上传，回到前台时自动拉取。"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2 py-3">
                <Button
                  size="pill"
                  variant="outline"
                  onClick={async () => {
                    const link = pairLink();
                    try {
                      await navigator.clipboard.writeText(link);
                      setCopied(true);
                      window.setTimeout(() => setCopied(false), 2000);
                    } catch {
                      notify(link);
                    }
                  }}
                >
                  {copied ? <Check className="size-3.5" /> : <Link2 className="size-3.5" />}
                  {copied ? "已复制" : "复制配对链接"}
                </Button>
                <Button
                  size="pill"
                  variant="ghost"
                  className="text-muted-foreground"
                  onClick={async () => {
                    await signOut();
                    notify("已退出登录");
                  }}
                >
                  <LogOut className="size-3.5" />
                  退出登录
                </Button>
              </div>
            </div>

            <p className="pt-1 text-[12px] leading-relaxed text-muted-foreground">
              把配对链接发到手机上打开，那台设备就不用再手输这些参数了。
              链接里只包含连接信息，不含密码。
            </p>
          </div>
        )}

        {(localError || error) && (
          <p className="mt-3 rounded-md border border-destructive/25 bg-destructive/5 px-3 py-2 text-[12.5px] leading-relaxed text-destructive">
            {localError ?? error}
          </p>
        )}
      </Card>

      {configured && !session && (
        <p className="pt-2 text-[12px] text-muted-foreground">
          <Cloud className="mr-1 inline size-3.5" />
          登录前不会上传任何数据。
        </p>
      )}

      {configured && session && (
        <p className="pt-2 text-[12px] leading-relaxed text-muted-foreground">
          <Copy className="mr-1 inline size-3.5" />
          同步是双向的：本地的改动会推上去，云端的改动会拉下来；同一行两边都改过时，以更新时间较晚的为准。
        </p>
      )}
    </section>
  );
}
