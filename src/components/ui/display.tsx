import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { AccentKey } from "@/lib/types";

export const ACCENT_CLASS: Record<AccentKey, { text: string; bg: string; ring: string; dot: string; hex: string }> = {
  sage: { text: "text-primary", bg: "bg-primary/10", ring: "border-primary/25", dot: "bg-primary", hex: "#3F5F4E" },
  clay: { text: "text-[#8E6249]", bg: "bg-[#A9765A]/12", ring: "border-[#A9765A]/25", dot: "bg-[#A9765A]", hex: "#A9765A" },
  steel: { text: "text-[#5A6B7E]", bg: "bg-[#6B7C90]/12", ring: "border-[#6B7C90]/25", dot: "bg-[#6B7C90]", hex: "#6B7C90" },
  sand: { text: "text-[#8F7A57]", bg: "bg-[#C7B396]/22", ring: "border-[#C7B396]/35", dot: "bg-[#C7B396]", hex: "#C7B396" },
  mauve: { text: "text-[#6F677E]", bg: "bg-[#8A8298]/14", ring: "border-[#8A8298]/25", dot: "bg-[#8A8298]", hex: "#8A8298" },
};

export function Badge({
  children,
  className,
  tone = "muted",
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "muted" | "accent" | "outline";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium tracking-[0.01em]",
        tone === "muted" && "bg-secondary text-muted-foreground",
        tone === "accent" && "bg-accent text-accent-foreground",
        tone === "outline" && "border border-border text-muted-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Progress({
  value,
  className,
  height = 6,
  tone,
}: {
  value: number;
  className?: string;
  height?: number;
  tone?: AccentKey;
}) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      className={cn("w-full overflow-hidden rounded-full bg-secondary", className)}
      style={{ height }}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <motion.div
        className={cn("h-full rounded-full", tone ? ACCENT_CLASS[tone].dot : "bg-primary")}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
  size = "md",
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; icon?: React.ReactNode }[];
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <div
      className={cn(
        "inline-flex w-full items-center gap-0.5 overflow-x-auto rounded-full border border-border/80 bg-card/70 p-0.5 no-scrollbar",
        className,
      )}
      role="tablist"
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full font-medium transition-colors",
              size === "md" ? "px-3 py-1.5 text-[13px]" : "px-2.5 py-1 text-[12px]",
              active ? "text-foreground" : "text-muted-foreground hover:text-foreground/80",
            )}
          >
            {active && (
              <motion.span
                layoutId={`segmented-${options.map((o) => o.value).join("")}`}
                className="absolute inset-0 rounded-full bg-secondary"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              {option.icon}
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function SectionHeader({
  title,
  action,
  hint,
  className,
}: {
  title: string;
  action?: React.ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-x-4 gap-y-2 pb-3", className)}>
      <div>
        <h2 className="section-title">{title}</h2>
        {hint && <p className="mt-1 text-[12px] text-muted-foreground">{hint}</p>}
      </div>
      {action}
    </div>
  );
}

export function Stat({
  label,
  value,
  sub,
  tone,
  className,
  align = "left",
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: AccentKey;
  className?: string;
  align?: "left" | "right";
}) {
  return (
    <div className={cn(align === "right" && "text-right", className)}>
      <div className="label-caps">{label}</div>
      <div className={cn("mt-1.5 text-[26px] font-medium leading-none numeral", tone ? ACCENT_CLASS[tone].text : "text-foreground")}>
        {value}
      </div>
      {sub && <div className="mt-1.5 text-[12px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

export function KeyValue({
  label,
  value,
  className,
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-baseline justify-between gap-4 py-2.5", className)}>
      <span className="text-[13px] text-muted-foreground">{label}</span>
      <span className="text-[14px] font-medium text-foreground numeral">{value}</span>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-3 px-6 py-12 text-center", className)}>
      {icon && (
        <div className="grid size-11 place-items-center rounded-full border border-border bg-card text-muted-foreground">
          {icon}
        </div>
      )}
      <div className="space-y-1.5">
        <p className="text-[15px] font-medium text-foreground">{title}</p>
        {description && (
          <p className="mx-auto max-w-[28ch] text-[13px] leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

export function IconBubble({
  children,
  accent = "sage",
  className,
}: {
  children: React.ReactNode;
  accent?: AccentKey;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid size-11 shrink-0 place-items-center rounded-lg border text-[20px] leading-none",
        ACCENT_CLASS[accent].bg,
        ACCENT_CLASS[accent].ring,
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Dot({ accent = "sage", className }: { accent?: AccentKey; className?: string }) {
  return <span className={cn("inline-block size-1.5 rounded-full", ACCENT_CLASS[accent].dot, className)} />;
}

export function Card({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("surface", className)} {...props}>
      {children}
    </div>
  );
}

export function Hairline({ className }: { className?: string }) {
  return <div className={cn("h-px w-full bg-border/70", className)} />;
}

export function Meter({
  value,
  target,
  tone = "sage",
  showLabels = true,
}: {
  value: number;
  target: number;
  tone?: AccentKey;
  showLabels?: boolean;
}) {
  const pct = target > 0 ? Math.min(100, (value / target) * 100) : 0;
  return (
    <div className="space-y-2">
      <Progress value={pct} tone={tone} height={8} />
      {showLabels && (
        <div className="flex items-center justify-between text-[12px] text-muted-foreground">
          <span className="numeral">{Math.round(pct)}%</span>
          <span className="numeral">{fmtShort(target)}</span>
        </div>
      )}
    </div>
  );
}

function fmtShort(n: number) {
  if (Math.abs(n) >= 10000) return `${(n / 10000).toFixed(1)} 万`;
  return n.toLocaleString("en-US");
}
