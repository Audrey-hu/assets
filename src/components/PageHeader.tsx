import type { ReactNode } from "react";
import { ChevronLeft, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { navigate } from "@/lib/router";
import { useUI } from "@/store/ui-store";

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  back,
  actions,
  searchable = true,
  className,
  children,
}: {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  back?: string | boolean;
  actions?: ReactNode;
  searchable?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  const { openModal } = useUI();

  return (
    <header
      className={cn(
        "sticky top-0 z-30 -mx-4 border-b border-border/60 bg-background/88 px-4 backdrop-blur-md sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:px-0 lg:backdrop-blur-none",
        className,
      )}
    >
      <div className="flex items-start gap-3 py-3 lg:py-0 lg:pb-5 lg:pt-2">
        {back && (
          <button
            type="button"
            aria-label="返回"
            onClick={() => (typeof back === "string" ? navigate(back) : window.history.back())}
            className="-ml-2 mt-0.5 grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground lg:hidden"
          >
            <ChevronLeft className="size-5" />
          </button>
        )}
        <div className="min-w-0 flex-1">
          {eyebrow && <div className="label-caps mb-1">{eyebrow}</div>}
          <h1 className="truncate text-[24px] font-semibold leading-tight tracking-[-0.02em] text-foreground lg:text-[28px]">
            {title}
          </h1>
          {subtitle && <div className="mt-1 text-[13px] text-muted-foreground">{subtitle}</div>}
          {children}
        </div>
        <div className="flex shrink-0 items-center gap-1.5 pt-0.5">
          {actions}
          {searchable && (
            <button
              type="button"
              aria-label="搜索"
              onClick={() => openModal("search")}
              className="grid size-9 place-items-center rounded-full border border-border/80 bg-card/70 text-muted-foreground transition-colors hover:text-foreground"
            >
              <Search className="size-[17px]" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
