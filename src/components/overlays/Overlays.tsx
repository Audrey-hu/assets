import { Dialog } from "@radix-ui/react-dialog";
import { DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useUI } from "@/store/ui-store";
import { QuickAddSheet } from "./QuickAddSheet";
import { SearchSheet } from "./SearchSheet";
import { FocusSetupSheet, FocusTimerOverlay, SessionSummarySheet } from "./FocusFlow";
import { EventEditor } from "@/components/editors/EventEditor";
import { HobbyEditor } from "@/components/editors/HobbyEditor";
import { CourseEditor, JourneyEditor, StageEditor } from "@/components/editors/JourneyEditor";
import { IncomeEditor } from "@/components/editors/IncomeEditor";
import { AssetEditor } from "@/components/editors/AssetEditor";
import { SavingsEditor, SavingsTxEditor } from "@/components/editors/SavingsEditor";

export function ConfirmDialog() {
  const { confirm, closeConfirm } = useUI();
  const open = Boolean(confirm);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && closeConfirm()}>
      <DialogContent size="sm">
        <DialogHeader title={confirm?.title ?? ""} description={confirm?.description} />
        <div className="flex items-center justify-end gap-2 px-5 pb-5">
          <Button variant="ghost" size="md" onClick={closeConfirm}>
            取消
          </Button>
          <Button
            variant={confirm?.destructive ? "destructive" : "primary"}
            size="md"
            onClick={async () => {
              const action = confirm?.onConfirm;
              closeConfirm();
              await action?.();
            }}
          >
            {confirm?.confirmLabel ?? "确认"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function Overlays() {
  return (
    <>
      <QuickAddSheet />
      <SearchSheet />
      <FocusSetupSheet />
      <EventEditor />
      <HobbyEditor />
      <JourneyEditor />
      <StageEditor />
      <CourseEditor />
      <IncomeEditor />
      <AssetEditor />
      <SavingsEditor />
      <SavingsTxEditor />
      <ConfirmDialog />
      <SessionSummarySheet />
      <FocusTimerOverlay />
    </>
  );
}
