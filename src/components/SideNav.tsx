import { Compass, Layers, Plus, Search, Sun, User, Wallet } from "lucide-react";
import { navigate } from "@/lib/router";
import { cn } from "@/lib/utils";
import { useUI } from "@/store/ui-store";
import { ITEMS } from "./BottomNav";

const ICONS = { today: Sun, journey: Compass, ledger: Wallet, assets: Layers, me: User } as const;

export function SideNav({ current }: { current: string[] }) {
  const { openModal } = useUI();
  const root = current[0] ?? "today";

  return (
    <aside className="sticky top-0 hidden h-dvh w-[248px] shrink-0 flex-col border-r border-border/70 px-4 py-7 lg:flex">
      <div className="px-2">
        <div className="text-[17px] font-semibold tracking-[-0.02em] text-foreground">人生账本</div>
        <div className="mt-1 text-[11.5px] leading-relaxed text-muted-foreground">
          把时间和钱，
          <br />
          变成看得见的人生。
        </div>
      </div>

      <button
        type="button"
        onClick={() => openModal("quickAdd")}
        className="mt-7 flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-3 text-[13.5px] font-medium text-foreground transition-colors hover:border-primary/30 hover:bg-accent/50"
      >
        <Plus className="size-4 text-primary" />
        记录今天
      </button>

      <nav className="mt-6 space-y-0.5">
        {ITEMS.map((item) => {
          const active = (item.match as readonly string[]).includes(root);
          const Icon = ICONS[item.key];
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => navigate(item.href)}
              className={cn(
                "group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[14px] transition-colors",
                active
                  ? "bg-accent/70 font-medium text-accent-foreground"
                  : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
              )}
            >
              <Icon className="size-[18px]" strokeWidth={active ? 2 : 1.7} />
              <span className="truncate">{item.label}</span>
              {active && <span className="ml-auto size-1.5 rounded-full bg-primary" />}
            </button>
          );
        })}
      </nav>

      <div className="mt-3 border-t border-border/70 pt-3">
        <button
          type="button"
          onClick={() => openModal("search")}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[14px] text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
        >
          <Search className="size-[18px]" strokeWidth={1.7} />
          Search
        </button>
        <button
          type="button"
          onClick={() => navigate("#/calendar")}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[14px] text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
        >
          <Compass className="size-[18px]" strokeWidth={1.7} />
          Calendar
        </button>
        <button
          type="button"
          onClick={() => navigate("#/moments")}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[14px] text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
        >
          <Layers className="size-[18px]" strokeWidth={1.7} />
          Life Moments
        </button>
      </div>

      <div className="mt-auto px-3 text-[11px] leading-relaxed text-muted-foreground/80">
        数据保存在这台设备上。
        <br />
        随时可以导出为 JSON。
      </div>
    </aside>
  );
}
