import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

function Overlay({ className, ...props }: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      className={cn(
        "fixed inset-0 z-50 bg-ink/25 backdrop-blur-[2px]",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
        className,
      )}
      {...props}
    />
  );
}

/** Centered modal — used for editors and confirmations. */
export const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    hideClose?: boolean;
    size?: "sm" | "md" | "lg";
  }
>(({ className, children, hideClose, size = "md", ...props }, ref) => (
  <DialogPrimitive.Portal>
    <Overlay />
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-3">
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          "pointer-events-auto relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-xl border border-border bg-popover shadow-lift",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
          "data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95",
          size === "sm" && "max-w-sm",
          size === "md" && "sm:max-w-lg",
          size === "lg" && "sm:max-w-2xl",
          className,
        )}
        {...props}
      >
        {children}
        {!hideClose && (
          <DialogPrimitive.Close
            className="absolute right-3 top-3 grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="关闭"
          >
            <X className="size-4" />
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </div>
  </DialogPrimitive.Portal>
));
DialogContent.displayName = "DialogContent";

export function DialogHeader({
  title,
  description,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1 px-5 pb-3 pt-5 pr-12", className)}>
      <DialogPrimitive.Title className="text-[17px] font-semibold tracking-[-0.01em] text-foreground">
        {title}
      </DialogPrimitive.Title>
      {description ? (
        <DialogPrimitive.Description className="text-[13px] leading-relaxed text-muted-foreground">
          {description}
        </DialogPrimitive.Description>
      ) : (
        <DialogPrimitive.Description className="sr-only">对话框</DialogPrimitive.Description>
      )}
    </div>
  );
}

/**
 * Sheet — a bottom sheet on phones, a centered dialog from `sm` upwards.
 * This is the main entry point for creation flows on mobile.
 */
export const SheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    hideClose?: boolean;
    size?: "sm" | "md" | "lg";
  }
>(({ className, children, hideClose, size = "md", ...props }, ref) => (
  <DialogPrimitive.Portal>
    <Overlay />
    <div className="pointer-events-none fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-5">
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          "pointer-events-auto relative flex max-h-[93dvh] w-full flex-col border border-border bg-popover shadow-lift",
          "rounded-t-2xl sm:rounded-xl",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
          "data-[state=open]:slide-in-from-bottom-6 data-[state=closed]:slide-out-to-bottom-6",
          "sm:data-[state=open]:slide-in-from-bottom-0 sm:data-[state=open]:zoom-in-95",
          "sm:data-[state=closed]:slide-out-to-bottom-0 sm:data-[state=closed]:zoom-out-95",
          size === "sm" && "sm:max-w-md",
          size === "md" && "sm:max-w-xl",
          size === "lg" && "sm:max-w-3xl",
          className,
        )}
        {...props}
      >
        <div className="mx-auto mt-2 h-1 w-9 rounded-full bg-border sm:hidden" aria-hidden />
        {children}
        {!hideClose && (
          <DialogPrimitive.Close
            className="absolute right-3 top-3 grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="关闭"
          >
            <X className="size-4" />
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </div>
  </DialogPrimitive.Portal>
));
SheetContent.displayName = "SheetContent";

export function SheetHeader({
  title,
  description,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("shrink-0 px-5 pb-3 pt-5 pr-12", className)}>
      <DialogPrimitive.Title className="text-[17px] font-semibold tracking-[-0.01em] text-foreground">
        {title}
      </DialogPrimitive.Title>
      {description ? (
        <DialogPrimitive.Description className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
          {description}
        </DialogPrimitive.Description>
      ) : (
        <DialogPrimitive.Description className="sr-only">面板</DialogPrimitive.Description>
      )}
    </div>
  );
}

export function SheetBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4", className)}
      {...props}
    />
  );
}

export function SheetFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "shrink-0 border-t border-border/70 bg-popover/95 px-5 py-3.5 safe-bottom",
        className,
      )}
      {...props}
    />
  );
}
