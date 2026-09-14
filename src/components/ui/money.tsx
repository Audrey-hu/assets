import { moneyEntries, type MoneyMap } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * 多币种金额显示。
 * 主币种用正常字号，后面的币种略小、略淡 —— 一眼能看出"这不是一个数"。
 */
export function Money({
  map,
  className,
  decimals,
  compact,
  fallback = "—",
  stacked = false,
}: {
  map: MoneyMap;
  className?: string;
  decimals?: number;
  compact?: boolean;
  fallback?: string;
  stacked?: boolean;
}) {
  const list = moneyEntries(map, { decimals, compact });

  if (!list.length) {
    return <span className={cn("numeral", className)}>{fallback}</span>;
  }

  if (stacked || list.length > 2) {
    return (
      <span className={cn("inline-flex flex-col", className)}>
        {list.map((item) => (
          <span key={item.code} className="numeral leading-tight">
            {item.text}
          </span>
        ))}
      </span>
    );
  }

  return (
    <span className={cn("numeral whitespace-nowrap", className)}>
      <span>{list[0].text}</span>
      {list.slice(1).map((item) => (
        <span key={item.code} className="text-[0.72em] text-muted-foreground">
          <span className="mx-1 opacity-60">·</span>
          {item.text}
        </span>
      ))}
    </span>
  );
}
