import { PageHeader } from "@/components/PageHeader";
import { Segmented } from "@/components/ui/display";
import { navigate } from "@/lib/router";
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
  return (
    <div className="animate-fade-up">
      <PageHeader eyebrow="账户" title="Ledger" subtitle={TITLES[section].subtitle} />
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
