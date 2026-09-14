import { useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "@/store/app-store";
import { Chip, Field, Input } from "@/components/ui/form";
import { CURRENCIES, currencySymbol, type CurrencyCode } from "@/lib/format";
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
  currency,
}: {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  placeholder?: string;
  /** 这条记录自己的币种；不传就跟随应用的默认币种 */
  currency?: string;
}) {
  return (
    <DecimalInput
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      prefix={currencySymbol(currency)}
    />
  );
}

/** 单条记录的币种选择器 */
export function CurrencyPicker({
  value,
  onChange,
  className,
}: {
  value: CurrencyCode;
  onChange: (value: CurrencyCode) => void;
  className?: string;
}) {
  return (
    <div className={cn("relative inline-flex", className)}>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as CurrencyCode)}
        className={cn(
          "h-9 w-full appearance-none rounded-md border border-input/90 bg-card pl-3 pr-8",
          "text-[13px] text-foreground transition-colors",
          "focus:border-primary/45 focus:outline-none focus:ring-2 focus:ring-ring/15",
        )}
      >
        {CURRENCIES.map((item) => (
          <option key={item.code} value={item.code}>
            {item.symbol} {item.label}
          </option>
        ))}
      </select>
      <svg
        aria-hidden
        viewBox="0 0 20 20"
        className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      >
        <path d="M6 8l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

/**
 * 选择「这节课属于哪门课程」。
 * 选好之后记一条 session，课程剩余课时会自动减一 —— 不用再去编辑课程。
 */
export function CoursePicker({
  courses,
  value,
  onChange,
  onPick,
}: {
  courses: import("@/lib/types").Course[];
  value?: string;
  onChange: (courseId: string | undefined) => void;
  /** 选中时回调，用来顺手把标题和时长填成这门课的样子 */
  onPick?: (course: import("@/lib/types").Course) => void;
}) {
  if (!courses.length) return null;
  return (
    <Field label="算作哪门课的课时" hint="选中后剩余课时会自动减一">
      <div className="flex flex-wrap gap-1.5">
        {courses.map((course) => {
          const remaining = Math.max(0, course.totalLessons - course.completedLessons);
          const active = value === course.id;
          return (
            <Chip
              key={course.id}
              active={active}
              onClick={() => {
                if (active) {
                  onChange(undefined);
                  return;
                }
                onChange(course.id);
                onPick?.(course);
              }}
            >
              {course.name}
              <span className={cn("text-[11px]", active ? "opacity-80" : "opacity-60")}>
                {remaining > 0 ? `剩 ${remaining} 节` : "已上完"}
              </span>
            </Chip>
          );
        })}
      </div>
    </Field>
  );
}

/**
 * 数字输入框。
 *
 * 关键点：输入过程中保留用户敲的原始文本，而不是每次都把数字渲染回去。
 * 否则刚敲下的小数点会被吃掉 —— 输 "1.7" 会变成 "17"，
 * 利率、金额、小时数这类字段就完全没法填小数。
 */
export function DecimalInput({
  value,
  onChange,
  allowDecimal = true,
  prefix,
  suffix,
  placeholder,
  className,
}: {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  allowDecimal?: boolean;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  placeholder?: string;
  className?: string;
}) {
  const [text, setText] = useState(() =>
    value === undefined || Number.isNaN(value) ? "" : String(value),
  );
  const lastEmitted = useRef<number | undefined>(value);

  /* 外部换了值（比如打开另一条记录）才回写文本，输入过程不动 */
  useEffect(() => {
    if (value !== lastEmitted.current) {
      lastEmitted.current = value;
      setText(value === undefined || Number.isNaN(value) ? "" : String(value));
    }
  }, [value]);

  function handleChange(raw: string) {
    let next = allowDecimal ? raw.replace(/[^\d.]/g, "") : raw.replace(/[^\d]/g, "");
    if (allowDecimal) {
      /* 只允许一个小数点 */
      const first = next.indexOf(".");
      if (first >= 0) {
        next = next.slice(0, first + 1) + next.slice(first + 1).replace(/\./g, "");
      }
    }
    setText(next);
    const parsed = next === "" || next === "." ? undefined : Number(next);
    lastEmitted.current = parsed;
    onChange(parsed);
  }

  return (
    <div className="relative">
      {prefix && (
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[15px] text-muted-foreground">
          {prefix}
        </span>
      )}
      <Input
        inputMode={allowDecimal ? "decimal" : "numeric"}
        className={cn(prefix && "pl-7", suffix && "pr-10", "numeral", className)}
        placeholder={placeholder}
        value={text}
        onChange={(event) => handleChange(event.target.value)}
      />
      {suffix && (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-muted-foreground">
          {suffix}
        </span>
      )}
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
