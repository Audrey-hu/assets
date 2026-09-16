import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { QUOTES, afterIndex, dayNumber, quoteIndexForDay } from "@/lib/quotes";
import { cn } from "@/lib/utils";

const STORE_KEY = "lifeledger.quote.v1";

interface SavedChoice {
  day: number;
  index: number;
}

/**
 * 首页的一句。
 *
 * 每天自动换一句（同一天刷新、换设备看到的都是同一句），
 * 如果当天这句不合心意，可以手动「换一句」——手动选过的那句当天会记住。
 */
export function QuoteOfTheDay({ className }: { className?: string }) {
  const today = dayNumber();
  const [index, setIndex] = useState(() => quoteIndexForDay(today));

  /* 恢复"今天手动换过的那一句" */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as SavedChoice;
      if (saved?.day !== dayNumber()) return;
      if (!Number.isInteger(saved.index) || saved.index < 0 || saved.index >= QUOTES.length) return;
      setIndex(saved.index);
    } catch {
      /* 读不出来就用当天那句 */
    }
  }, []);

  const quote = QUOTES[index] ?? QUOTES[0];

  function shuffle() {
    const next = afterIndex(index);
    setIndex(next);
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ day: dayNumber(), index: next }));
    } catch {
      /* 存不下也没关系，本次会话内有效 */
    }
  }

  return (
    <section className={cn("pt-5 lg:pt-0", className)}>
      <div className="rounded-xl border border-border/70 bg-gradient-to-br from-card via-card to-secondary/50 px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <span className="label-caps">今日一句</span>
          <button
            type="button"
            onClick={shuffle}
            className="flex items-center gap-1 rounded-full px-2 py-1 text-[11.5px] text-muted-foreground/80 transition-colors hover:bg-secondary/70 hover:text-foreground"
          >
            <RefreshCw className="size-3" />
            换一句
          </button>
        </div>

        <div className="mt-2.5 flex gap-3">
          <span
            aria-hidden="true"
            className="mt-1 w-[2px] shrink-0 self-stretch rounded-full bg-primary/25"
          />
          <div className="min-w-0">
            <blockquote className="max-w-[42ch] font-quote text-[17px] leading-[1.8] tracking-[0.01em] text-foreground">
              {quote.text}
            </blockquote>
            {quote.from && (
              <div className="mt-1.5 text-[12px] text-muted-foreground">— {quote.from}</div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
