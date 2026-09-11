import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cn } from "@/lib/utils";

export const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn("text-[13px] font-medium text-foreground/80", className)}
    {...props}
  />
));
Label.displayName = "Label";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-11 w-full rounded-md border border-input/90 bg-card px-3 text-[15px] text-foreground",
        "placeholder:text-muted-foreground/70",
        "transition-colors focus:border-primary/45 focus:outline-none focus:ring-2 focus:ring-ring/15",
        "disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "min-h-[84px] w-full resize-none rounded-md border border-input/90 bg-card px-3 py-2.5 text-[15px] leading-relaxed text-foreground",
      "placeholder:text-muted-foreground/70",
      "transition-colors focus:border-primary/45 focus:outline-none focus:ring-2 focus:ring-ring/15",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <div className="relative">
    <select
      ref={ref}
      className={cn(
        "h-11 w-full appearance-none rounded-md border border-input/90 bg-card px-3 pr-9 text-[15px] text-foreground",
        "transition-colors focus:border-primary/45 focus:outline-none focus:ring-2 focus:ring-ring/15",
        className,
      )}
      {...props}
    >
      {children}
    </select>
    <svg
      aria-hidden
      viewBox="0 0 20 20"
      className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
    >
      <path d="M6 8l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </div>
));
Select.displayName = "Select";

export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label?: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <div className="flex items-baseline justify-between gap-3">
          <Label>{label}</Label>
          {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
        </div>
      )}
      {children}
      {error && <p className="text-[12px] text-destructive">{error}</p>}
    </div>
  );
}

export function Chip({
  active,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] transition-colors",
        active
          ? "border-primary/35 bg-accent text-accent-foreground"
          : "border-border bg-card/70 text-muted-foreground hover:text-foreground",
        className,
      )}
      {...props}
    />
  );
}

export function Switch({
  checked,
  onCheckedChange,
  label,
  description,
}: {
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onCheckedChange(!checked)}
      className="flex w-full items-center justify-between gap-4 py-1 text-left"
    >
      <span>
        <span className="block text-[14px] text-foreground">{label}</span>
        {description && (
          <span className="mt-0.5 block text-[12px] text-muted-foreground">{description}</span>
        )}
      </span>
      <span
        className={cn(
          "relative h-6 w-10 shrink-0 rounded-full border transition-colors",
          checked ? "border-primary/40 bg-primary/85" : "border-border bg-secondary",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 rounded-full bg-card shadow-sm transition-transform duration-200",
            checked ? "translate-x-[19px]" : "translate-x-0.5",
          )}
          style={{ width: 18, height: 18 }}
        />
      </span>
    </button>
  );
}
