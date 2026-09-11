import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";
import { useApp } from "@/store/app-store";

export function Toaster() {
  const { toasts, dismissToast } = useApp();
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[80] flex flex-col items-center gap-2 px-4 sm:bottom-8">
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <motion.button
            key={toast.id}
            type="button"
            onClick={() => dismissToast(toast.id)}
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-auto flex max-w-full items-center gap-2 rounded-full border border-border bg-popover/95 px-3.5 py-2 text-[13px] text-foreground shadow-soft backdrop-blur"
          >
            {toast.tone === "success" && (
              <span className="grid size-4 place-items-center rounded-full bg-primary/12 text-primary">
                <Check className="size-3" strokeWidth={2.4} />
              </span>
            )}
            <span className="truncate">{toast.message}</span>
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}
