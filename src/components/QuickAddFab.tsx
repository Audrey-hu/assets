import { Plus } from "lucide-react";
import { useUI } from "@/store/ui-store";

export function QuickAddFab() {
  const { openModal } = useUI();
  return (
    <button
      type="button"
      aria-label="添加记录"
      onClick={() => openModal("quickAdd")}
      className="fixed bottom-[76px] right-4 z-40 grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-lift transition-transform active:scale-95 lg:hidden"
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 72px)" }}
    >
      <Plus className="size-6" strokeWidth={2} />
    </button>
  );
}
