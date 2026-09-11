import { Compass, Layers, Sun, User, Wallet } from "lucide-react";
import { motion } from "framer-motion";
import { navigate } from "@/lib/router";
import { cn } from "@/lib/utils";

const ITEMS = [
  { key: "today", label: "Today", href: "#/today", icon: Sun, match: ["today", ""] },
  { key: "journey", label: "Journey", href: "#/journey", icon: Compass, match: ["journey", "hobby"] },
  { key: "ledger", label: "Ledger", href: "#/ledger", icon: Wallet, match: ["ledger"] },
  { key: "assets", label: "Assets", href: "#/assets", icon: Layers, match: ["assets"] },
  { key: "me", label: "Me", href: "#/me", icon: User, match: ["me"] },
] as const;

export function BottomNav({ current }: { current: string[] }) {
  const root = current[0] ?? "today";
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background/92 backdrop-blur-xl safe-bottom lg:hidden">
      <div className="mx-auto flex max-w-md items-stretch justify-between px-1.5 pt-1">
        {ITEMS.map((item) => {
          const active = (item.match as readonly string[]).includes(root);
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => navigate(item.href)}
              className={cn(
                "relative flex min-w-0 flex-1 flex-col items-center gap-1 rounded-lg px-1 py-2 transition-colors",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              {active && (
                <motion.span
                  layoutId="bottom-nav-active"
                  className="absolute -top-1 h-[3px] w-7 rounded-full bg-primary"
                  transition={{ type: "spring", stiffness: 420, damping: 32 }}
                />
              )}
              <Icon className="size-[21px]" strokeWidth={active ? 2 : 1.7} />
              <span className="truncate text-[10.5px] font-medium tracking-[0.01em]">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export { ITEMS };
