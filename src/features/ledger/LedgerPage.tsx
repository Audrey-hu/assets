import { PageHeader } from "@/components/PageHeader";
import { Segmented } from "@/components/ui/display";
import { useApp } from "@/store/app-store";
import { navigate } from "@/lib/router";
import { CURRENCIES } from "@/lib/format";
import type { CurrencyCode } from "@/lib/format";
import { SavingsPage } from "./SavingsPage";
import { IncomePage } from "./IncomePage";
import { TimePage } from "./TimePage";
import { InvestingPage } from "./InvestingPage";

export type LedgerSection = "savings" | "investing" | "income" | "time";

const TITLES: Record<LedgerSection, { subtitle: string }> = {
  savings: { subtitle: "存款、备用金与蓄水池" },
  investing: { subtitle: "黄金、基金、股票、数字货币" },
  income: { subtitle: "下班之后赚到的钱" },
  time: { subtitle: "下班之后的时间去哪了" },
};

export function LedgerPage({ section }: { section: LedgerSection }) {
  const { settings, updateSettings } = useApp();

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow="账户"
        title="Ledger"
        subtitle={TITLES[section].subtitle}
        actions={
          <label className="relative inline-flex items-center" title="默认币种：只影响新记录，已有的金额不会因此改变">
            <span className="sr-only">默认币种</span>
            <select
              value={settings.currency}
              onChange={(event) =>
                updateSettings({ currency: event.target.value as CurrencyCode })
              }
              className="h-9 appearance-none rounded-full border border-border/80 bg-card/70 pl-3 pr-7 text-[12.5px] text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring/15"
            >
              {CURRENCIES.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.symbol} {item.code}
                </option>
              ))}
            </select>
            <svg
              aria-hidden
              viewBox="0 0 20 20"
              className="pointer-events-none absolute right-2.5 size-3.5 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            >
              <path d="M6 8l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </label>
        }
      />
      <div className="pb-5 pt-4 lg:pt-0">
        <Segmented
          value={section}
          onChange={(value) => navigate(`#/ledger/${value}`)}
          options={[
            { value: "savings", label: "储蓄" },
            { value: "investing", label: "理财" },
            { value: "income", label: "收入" },
            { value: "time", label: "时间" },
          ]}
          className="max-w-md"
        />
      </div>
      {section === "savings" && <SavingsPage />}
      {section === "investing" && <InvestingPage />}
      {section === "income" && <IncomePage />}
      {section === "time" && <TimePage />}
    </div>
  );
}
