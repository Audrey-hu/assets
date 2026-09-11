import { Dialog } from "@radix-ui/react-dialog";
import {
  CalendarCheck,
  Coins,
  FileText,
  Layers,
  Play,
  Receipt,
  Sparkles,
  Timer,
} from "lucide-react";
import { SheetBody, SheetContent, SheetHeader } from "@/components/ui/dialog";
import { useUI } from "@/store/ui-store";
import { cn } from "@/lib/utils";

export function QuickAddSheet() {
  const { modal, closeModal, openModal } = useUI();
  const open = modal === "quickAdd";

  const actions = [
    {
      key: "focus",
      label: "Start Focus",
      hint: "开始一次专注",
      icon: Play,
      tone: "bg-primary text-primary-foreground",
      run: () => openModal("focusSetup"),
    },
    {
      key: "time",
      label: "Log Time",
      hint: "补记一段时间",
      icon: Timer,
      run: () => openModal("event", { lockType: "session", initial: { durationMin: 30 } }),
    },
    {
      key: "expense",
      label: "Add Expense",
      hint: "课程 / 器材 / 场地",
      icon: Receipt,
      run: () => openModal("event", { lockType: "expense" }),
    },
    {
      key: "income",
      label: "Add Income",
      hint: "业余收入项目",
      icon: Coins,
      run: () => openModal("income"),
    },
    {
      key: "milestone",
      label: "Add Milestone",
      hint: "值得记住的一步",
      icon: CalendarCheck,
      run: () => openModal("event", { lockType: "milestone" }),
    },
    {
      key: "asset",
      label: "Add Asset",
      hint: "留下的东西",
      icon: Layers,
      run: () => openModal("asset"),
    },
    {
      key: "note",
      label: "Add Note",
      hint: "一句话记录",
      icon: FileText,
      run: () => openModal("event", { lockType: "note" }),
    },
    {
      key: "reflect",
      label: "Reflection",
      hint: "想清楚一件事",
      icon: Sparkles,
      run: () => openModal("event", { lockType: "reflection" }),
    },
  ];

  return (
    <Dialog open={open} onOpenChange={(next) => !next && closeModal()}>
      <SheetContent size="md">
        <SheetHeader title="记录" description="所有记录都会自动进入 Today、After Work 与时间线。" />
        <SheetBody className="pb-5">
          <div className="grid grid-cols-2 gap-2">
            {actions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.key}
                  type="button"
                  onClick={action.run}
                  className={cn(
                    "flex min-h-[86px] flex-col items-start justify-between rounded-lg border border-border/80 bg-card p-3.5 text-left transition-colors hover:border-primary/30 hover:bg-accent/40",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-8 place-items-center rounded-md",
                      action.tone ?? "bg-secondary text-foreground/70",
                    )}
                  >
                    <Icon className="size-4" strokeWidth={1.9} />
                  </span>
                  <span className="mt-3">
                    <span className="block text-[14px] font-medium text-foreground">{action.label}</span>
                    <span className="mt-0.5 block text-[11.5px] text-muted-foreground">{action.hint}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </SheetBody>
      </SheetContent>
    </Dialog>
  );
}
