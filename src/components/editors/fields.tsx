import { useMemo } from "react";
import { useApp } from "@/store/app-store";
import { Chip, Field, Input } from "@/components/ui/form";
import { cn } from "@/lib/utils";
import type { AccentKey } from "@/lib/types";
import { ACCENT_CLASS } from "@/components/ui/display";

/** Shared hobby / journey linker used by every editor. */
export function TargetPicker({
  hobbyId,
  journeyId,
  onChange,
  allowNone = true,
  className,
}: {
  hobbyId?: string;
  journeyId?: string;
  onChange: (value: { hobbyId?: string; journeyId?: string }) => void;
  allowNone?: boolean;
  className?: string;
}) {
  const { data } = useApp();
  const hobbies = useMemo(
    () => data.hobbies.filter((h) => h.status !== "archived"),
    [data.hobbies],
  );
  const journeys = useMemo(
    () => data.journeys.filter((j) => j.status !== "archived"),
    [data.journeys],
  );
  const selected = hobbyId ? `h:${hobbyId}` : journeyId ? `j:${journeyId}` : "";

  return (
    <Field label="关联到">
      <div className={cn("flex flex-wrap gap-1.5", className)}>
        {allowNone && (
          <Chip active={!selected} onClick={() => onChange({})}>
            不关联
          </Chip>
        )}
        {hobbies.map((hobby) => (
          <Chip
            key={hobby.id}
            active={selected === `h:${hobby.id}`}
            onClick={() => onChange({ hobbyId: hobby.id })}
          >
            <span aria-hidden>{hobby.icon}</span>
            {hobby.name}
          </Chip>
        ))}
        {journeys.map((journey) => (
          <Chip
            key={journey.id}
            active={selected === `j:${journey.id}`}
            onClick={() => onChange({ journeyId: journey.id })}
          >
            {journey.name}
          </Chip>
        ))}
      </div>
    </Field>
  );
}

export function AccentPicker({
  value,
  onChange,
}: {
  value: AccentKey;
  onChange: (value: AccentKey) => void;
}) {
  const options: AccentKey[] = ["sage", "clay", "steel", "sand", "mauve"];
  return (
    <Field label="色调">
      <div className="flex gap-2">
        {options.map((accent) => (
          <button
            key={accent}
            type="button"
            aria-label={accent}
            onClick={() => onChange(accent)}
            className={cn(
              "size-8 rounded-full border-2 transition-all",
              ACCENT_CLASS[accent].dot,
              value === accent ? "border-foreground/60 scale-105" : "border-transparent opacity-70",
            )}
          />
        ))}
      </div>
    </Field>
  );
}

export function EmojiPicker({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <Field label="图标">
      <div className="flex flex-wrap gap-1.5">
        {options.map((icon) => (
          <button
            key={icon}
            type="button"
            onClick={() => onChange(icon)}
            className={cn(
              "grid size-9 place-items-center rounded-md border text-[17px] transition-colors",
              value === icon ? "border-primary/40 bg-accent" : "border-border hover:bg-secondary/60",
            )}
          >
            {icon}
          </button>
        ))}
      </div>
    </Field>
  );
}

export function MoneyInput({
  value,
  onChange,
  placeholder = "0",
}: {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[15px] text-muted-foreground">
        ¥
      </span>
      <Input
        inputMode="decimal"
        className="pl-7 numeral"
        placeholder={placeholder}
        value={value === undefined || Number.isNaN(value) ? "" : String(value)}
        onChange={(event) => {
          const raw = event.target.value.replace(/[^\d.]/g, "");
          onChange(raw === "" ? undefined : Number(raw));
        }}
      />
    </div>
  );
}

export function TimeInput({
  value,
  onChange,
}: {
  value?: string;
  onChange: (value: string | undefined) => void;
}) {
  return (
    <Input
      type="time"
      className="numeral"
      value={value ?? ""}
      onChange={(event) => onChange(event.target.value || undefined)}
    />
  );
}
