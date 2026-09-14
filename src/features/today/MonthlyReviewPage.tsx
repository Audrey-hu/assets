import { useMemo, useState } from "react";
import { Dialog } from "@radix-ui/react-dialog";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, SectionHeader } from "@/components/ui/display";
import { SheetBody, SheetContent, SheetFooter, SheetHeader } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/form";
import { CategoryBar, CategoryLegend } from "@/components/charts";
import { Money } from "@/components/ui/money";
import { useApp } from "@/store/app-store";
import { categoryBreakdown, monthSummary } from "@/lib/stats";
import { fmtHours, fmtMoney, monthKeyToDate, fmtMonthLong } from "@/lib/format";
import { navigate } from "@/lib/router";
import { addMonths, endOfMonth, format, startOfMonth, subMonths } from "date-fns";

const QUESTIONS = [
  { key: "worth", label: "What was worth it?", placeholder: "这个月哪一笔投入最值得？" },
  { key: "unnecessary", label: "What felt unnecessary?", placeholder: "哪些投入其实没必要？" },
  { key: "created", label: "What did you create?", placeholder: "这个月你留下了什么？" },
  { key: "continue", label: "What should you continue next month?", placeholder: "下个月想继续什么？" },
];

export function MonthlyReviewPage({ month }: { month: string }) {
  const { data, saveEvent, notify } = useApp();
  const [reflectionOpen, setReflectionOpen] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const summary = useMemo(() => monthSummary(data, month), [data, month]);
  const monthDate = useMemo(() => monthKeyToDate(month), [month]);
  const slices = useMemo(
    () => categoryBreakdown(data, startOfMonth(monthDate), endOfMonth(monthDate)),
    [data, monthDate],
  );

  const existingReflection = useMemo(
    () =>
      data.events.find(
        (e) => e.type === "reflection" && e.date.startsWith(month) && e.meta?.monthReview === true,
      ),
    [data.events, month],
  );

  async function saveReflection() {
    const now = new Date().toISOString();
    const note = QUESTIONS.map((q) => `${q.label}\n${answers[q.key] ?? ""}`.trim()).join("\n\n");
    await saveEvent({
      id: existingReflection?.id ?? `evt_${Date.now().toString(36)}`,
      type: "reflection",
      date: format(endOfMonth(monthDate), "yyyy-MM-dd"),
      title: `${format(monthDate, "LLLL yyyy")} Review`,
      note,
      photoIds: [],
      timeCategory: "growth",
      meta: { monthReview: true },
      createdAt: existingReflection?.createdAt ?? now,
      updatedAt: now,
    });
    notify("回顾已保存", "success");
    setReflectionOpen(false);
  }

  return (
    <div className="animate-fade-up">
      <PageHeader
        back
        title={`${format(monthDate, "LLLL")} Review`}
        subtitle={format(monthDate, "yyyy")}
        searchable={false}
        actions={
          <div className="flex items-center gap-1">
            <Button
              size="iconSm"
              variant="ghost"
              aria-label="上个月"
              onClick={() => navigate(`#/review/${format(subMonths(monthDate, 1), "yyyy-MM")}`)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              size="iconSm"
              variant="ghost"
              aria-label="下个月"
              onClick={() => navigate(`#/review/${format(addMonths(monthDate, 1), "yyyy-MM")}`)}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        }
      />

      <Card className="grid grid-cols-2 divide-border/70 sm:grid-cols-4 sm:divide-x">
        <Cell label="Time invested" value={fmtHours(summary.minutes)} />
        <Cell label="Money invested" value={<Money map={summary.invested} />} />
        <Cell label="Side income" value={<Money map={summary.sideIncome} />} tone />
        <Cell label="Assets created" value={String(summary.assetsCreated)} />
      </Card>

      <section className="pt-7">
        <SectionHeader title="Highlights" />
        <Card className="divide-y divide-border/70 px-5">
          <Row
            label="Top Investment"
            value={summary.topExpense ? `${summary.topExpense.title} · ${fmtMoney(summary.topExpense.amount)}` : "—"}
          />
          <Row
            label="Most Time"
            value={summary.mostTime ? `${summary.mostTime.name} · ${fmtHours(summary.mostTime.minutes)}` : "—"}
          />
          <Row
            label="Most Consistent"
            value={
              summary.mostConsistent
                ? `${summary.mostConsistent.name} · ${summary.mostConsistent.sessions} sessions`
                : "—"
            }
          />
        </Card>
      </section>

      {slices.length > 0 && (
        <section className="pt-7">
          <SectionHeader title="时间组成" />
          <Card className="space-y-4 p-5">
            <CategoryBar slices={slices} />
            <CategoryLegend slices={slices} />
          </Card>
        </section>
      )}

      <section className="pt-7">
        <SectionHeader
          title="反思"
          hint={existingReflection ? "已经写过一次，可以继续补充" : "四个问题，慢慢回答"}
          action={
            <Button
              size="pill"
              variant="outline"
              onClick={() => {
                const parsed: Record<string, string> = {};
                existingReflection?.note?.split("\n\n").forEach((block) => {
                  const [label, ...rest] = block.split("\n");
                  const question = QUESTIONS.find((q) => q.label === label.trim());
                  if (question) parsed[question.key] = rest.join("\n").trim();
                });
                setAnswers(parsed);
                setReflectionOpen(true);
              }}
            >
              {existingReflection ? "编辑回顾" : "写这个月的回顾"}
            </Button>
          }
        />
        {existingReflection ? (
          <Card className="space-y-4 p-5">
            {existingReflection.note?.split("\n\n").map((block) => {
              const [label, ...rest] = block.split("\n");
              return (
                <div key={label}>
                  <div className="text-[12.5px] font-medium text-foreground/80">{label}</div>
                  <p className="mt-1 whitespace-pre-wrap text-[13.5px] leading-relaxed text-muted-foreground">
                    {rest.join("\n").trim() || "—"}
                  </p>
                </div>
              );
            })}
          </Card>
        ) : (
          <Card className="px-5 py-6 text-center text-[13px] text-muted-foreground">
            这个月还没有写回顾。
          </Card>
        )}
      </section>

      <Dialog open={reflectionOpen} onOpenChange={setReflectionOpen}>
        <SheetContent>
          <SheetHeader title={`${fmtMonthLong(monthDate)} Review`} description="不需要用力，写你真实想的。" />
          <SheetBody className="space-y-4">
            {QUESTIONS.map((question) => (
              <div key={question.key} className="space-y-1.5">
                <label className="text-[13px] font-medium text-foreground/80">{question.label}</label>
                <Textarea
                  value={answers[question.key] ?? ""}
                  placeholder={question.placeholder}
                  onChange={(event) =>
                    setAnswers((prev) => ({ ...prev, [question.key]: event.target.value }))
                  }
                />
              </div>
            ))}
          </SheetBody>
          <SheetFooter className="flex items-center justify-end gap-2">
            <Button variant="ghost" size="lg" onClick={() => setReflectionOpen(false)}>
              取消
            </Button>
            <Button size="lg" onClick={saveReflection}>
              保存回顾
            </Button>
          </SheetFooter>
        </SheetContent>
      </Dialog>
    </div>
  );
}

function Cell({
  label,
  value,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  tone?: boolean;
}) {
  return (
    <div className="border-b border-border/70 p-4 last:border-b-0 sm:border-b-0">
      <div className="label-caps">{label}</div>
      <div
        className={
          tone
            ? "mt-2 numeral text-[24px] font-medium leading-none text-primary"
            : "mt-2 numeral text-[24px] font-medium leading-none text-foreground"
        }
      >
        {value}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      <span className="text-right text-[13.5px] text-foreground">{value}</span>
    </div>
  );
}
