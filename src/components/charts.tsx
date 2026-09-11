import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TIME_CATEGORY } from "@/lib/labels";
import { fmtHours } from "@/lib/format";
import type { CategorySlice } from "@/lib/stats";

const AXIS = {
  stroke: "hsl(var(--muted-foreground))",
  fontSize: 11,
  tickLine: false,
  axisLine: false,
} as const;

export function TrendChart({
  data,
  color = "#3F5F4E",
  height = 168,
  formatter = (value: number) => String(value),
  yWidth = 44,
}: {
  data: { label: string; value: number }[];
  color?: string;
  height?: number;
  formatter?: (value: number) => string;
  yWidth?: number;
}) {
  if (data.length === 0) {
    return (
      <div className="grid h-[168px] place-items-center text-[13px] text-muted-foreground">
        还没有足够的数据画出曲线。
      </div>
    );
  }
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 6, bottom: 0, left: -8 }}>
          <defs>
            <linearGradient id={`grad-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.16} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="2 6" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="label" {...AXIS} tickMargin={8} />
          <YAxis {...AXIS} width={yWidth} tickFormatter={(v) => formatter(Number(v))} />
          <Tooltip
            cursor={{ stroke: "hsl(var(--border))" }}
            contentStyle={{
              borderRadius: 12,
              border: "1px solid hsl(var(--border))",
              background: "hsl(var(--popover))",
              fontSize: 12,
              boxShadow: "0 8px 24px -16px rgba(29,28,26,.28)",
            }}
            formatter={(value: number | string) => formatter(Number(value))}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#grad-${color.replace("#", "")})`}
            dot={{ r: 2.5, strokeWidth: 0, fill: color }}
            activeDot={{ r: 4, strokeWidth: 0, fill: color }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SimpleLineChart({
  data,
  color = "#8A8298",
  height = 150,
  formatter = (value: number) => String(value),
  yDomain,
}: {
  data: { label: string; value: number }[];
  color?: string;
  height?: number;
  formatter?: (value: number) => string;
  yDomain?: [number, number];
}) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
          <CartesianGrid strokeDasharray="2 6" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="label" {...AXIS} tickMargin={8} />
          <YAxis {...AXIS} width={40} domain={yDomain ?? ["auto", "auto"]} tickFormatter={(v) => formatter(Number(v))} />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: "1px solid hsl(var(--border))",
              background: "hsl(var(--popover))",
              fontSize: 12,
            }}
            formatter={(value: number | string) => formatter(Number(value))}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={{ r: 3, strokeWidth: 0, fill: color }}
            activeDot={{ r: 4.5, strokeWidth: 0, fill: color }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** A single horizontal proportion bar — quiet, no donut shouting. */
export function CategoryBar({ slices }: { slices: CategorySlice[] }) {
  const total = slices.reduce((acc, s) => acc + s.minutes, 0);
  if (total === 0) return null;
  return (
    <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-secondary">
      {slices.map((slice) => (
        <div
          key={slice.category}
          className="h-full first:rounded-l-full last:rounded-r-full"
          style={{
            width: `${slice.share * 100}%`,
            backgroundColor: TIME_CATEGORY[slice.category].hex,
          }}
          title={`${TIME_CATEGORY[slice.category].label} ${fmtHours(slice.minutes)}`}
        />
      ))}
    </div>
  );
}

export function CategoryLegend({ slices }: { slices: CategorySlice[] }) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-3">
      {slices.map((slice) => (
        <li key={slice.category} className="flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-2">
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: TIME_CATEGORY[slice.category].hex }}
            />
            <span className="truncate text-[13px] text-foreground/85">
              {TIME_CATEGORY[slice.category].label}
            </span>
          </span>
          <span className="numeral text-[13px] text-muted-foreground">
            {fmtHours(slice.minutes)}
          </span>
        </li>
      ))}
    </ul>
  );
}
