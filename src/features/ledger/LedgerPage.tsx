import { PageHeader } from "@/components/PageHeader";
import { Segmented } from "@/components/ui/display";
import { navigate } from "@/lib/router";
import { SavingsPage } from "./SavingsPage";
import { IncomePage } from "./IncomePage";
import { TimePage } from "./TimePage";

export type LedgerSection = "savings" | "income" | "time";

const TITLES: Record<LedgerSection, { subtitle: string }> = {
  savings: { subtitle: "存款、备用金与蓄水池" },
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
            { value: "savings", label: "Savings" },
            { value: "income", label: "Side Income" },
            { value: "time", label: "After Work" },
          ]}
          className="max-w-md"
        />
      </div>
      {section === "savings" && <SavingsPage />}
      {section === "income" && <IncomePage />}
      {section === "time" && <TimePage />}
    </div>
  );
}
