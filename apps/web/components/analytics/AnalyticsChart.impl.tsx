"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * The single, reusable chart primitive for the Analytics module (Module 6 –
 * Phase F). Every chart in the app renders through this component so we use
 * **one** charting library (Recharts) consistently. The component is
 * presentation-only: it receives fully-computed backend data and paints it.
 *
 * Supported kinds: `line`, `bar`, `area`, `donut`.
 *
 * NOTE: this file is intentionally split from `AnalyticsChart.tsx` so the
 * Recharts dependency can be code-split (lazy-loaded) and kept out of the
 * analytics route's initial bundle (Module 6 – Phase H1, bundle optimization).
 */

export type ChartKind = "line" | "bar" | "area" | "donut";

export interface ChartSeries {
  /** dataKey within each datum. */
  key: string;
  /** Display name for the legend/tooltip. Defaults to `key`. */
  name?: string;
  /** Override the series color. */
  color?: string;
}

/** Shared palette so every chart instance stays visually consistent. */
export const CHART_PALETTE = [
  "hsl(var(--primary))",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#3b82f6",
  "#a855f7",
  "#14b8a6",
  "#ec4899",
];

const FALLBACK_COLOR = "#7c3aed";

export interface AnalyticsChartProps {
  kind: ChartKind;
  /** Chart data. For line/bar/area, rows keyed by `xKey` + each series `key`. */
  data: ReadonlyArray<Record<string, unknown>>;
  /** Series for line/bar/area charts. Ignored for `donut`. */
  series?: ReadonlyArray<ChartSeries>;
  /** X-axis key for line/bar/area charts. */
  xKey?: string;
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  showTooltip?: boolean;
  className?: string;
  /** Accessible label describing the chart's content. */
  ariaLabel?: string;
  /** Optional tick/tooltip value formatter. */
  valueFormatter?: (value: number) => string;
}

/** Loading placeholder that mimics a chart's footprint. */
export function ChartSkeleton({ height = 260 }: { height?: number }) {
  return (
    <div
      className="flex w-full items-end gap-2 px-2 pb-6"
      style={{ height }}
      aria-hidden
    >
      {Array.from({ length: 12 }).map((_, i) => (
        <Skeleton
          key={i}
          className="flex-1 rounded-md"
          style={{ height: `${30 + ((i * 37) % 60)}%` }}
        />
      ))}
    </div>
  );
}

function colorAt(index: number): string {
  return CHART_PALETTE[index % CHART_PALETTE.length] ?? FALLBACK_COLOR;
}

export function AnalyticsChart({
  kind,
  data,
  series = [],
  xKey,
  height = 260,
  showGrid = true,
  showLegend = false,
  showTooltip = true,
  className,
  ariaLabel,
  valueFormatter,
}: AnalyticsChartProps) {
  const hasData = data.length > 0;

  if (!hasData) {
    return (
      <div
        className={cn("flex items-center justify-center text-sm text-muted-foreground", className)}
        style={{ height }}
        role="img"
        aria-label={ariaLabel ?? "No chart data"}
      >
        No data to display
      </div>
    );
  }

  return (
    <div
      className={cn("w-full", className)}
      style={{ height }}
      role="img"
      aria-label={ariaLabel ?? "Analytics chart"}
    >
      <ResponsiveContainer width="100%" height="100%">
        {renderChart(kind, data, series, xKey, showGrid, showLegend, showTooltip, valueFormatter)}
      </ResponsiveContainer>
    </div>
  );
}

function buildTooltipFormatter(valueFormatter?: (value: number) => string) {
  if (!valueFormatter) return undefined;
  return (value: unknown) =>
    typeof value === "number" ? valueFormatter(value) : String(value);
}

function renderChart(
  kind: ChartKind,
  data: ReadonlyArray<Record<string, unknown>>,
  series: ReadonlyArray<ChartSeries>,
  xKey: string | undefined,
  showGrid: boolean,
  showLegend: boolean,
  showTooltip: boolean,
  valueFormatter: ((value: number) => string) | undefined
) {
  const tooltipFormatter = buildTooltipFormatter(valueFormatter);

  if (kind === "donut") {
    return (
      <PieChart>
        <Pie
          data={data as Array<Record<string, unknown>>}
          dataKey="value"
          nameKey="name"
          innerRadius="55%"
          outerRadius="80%"
          paddingAngle={2}
          label={false}
        >
          {(data as Array<{ name?: string; color?: string }>).map((entry, i) => (
            <Cell key={entry.name ?? i} fill={entry.color ?? colorAt(i)} />
          ))}
        </Pie>
        {showTooltip && <Tooltip formatter={tooltipFormatter} />}
        {showLegend && <Legend />}
      </PieChart>
    );
  }

  const axis = (
    <>
      <XAxis dataKey={xKey} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
      <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" width={36} />
      {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />}
      {showTooltip && <Tooltip formatter={tooltipFormatter} />}
      {showLegend && <Legend />}
    </>
  );

  if (kind === "line") {
    return (
      <LineChart data={data as Array<Record<string, unknown>>}>
        {axis}
        {series.map((s, i) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.name ?? s.key}
            stroke={s.color ?? colorAt(i)}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    );
  }

  if (kind === "area") {
    return (
      <AreaChart data={data as Array<Record<string, unknown>>}>
        {axis}
        {series.map((s, i) => {
          const color = s.color ?? colorAt(i);
          return (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.name ?? s.key}
              stroke={color}
              fill={color}
              fillOpacity={0.15}
              strokeWidth={2}
              isAnimationActive={false}
            />
          );
        })}
      </AreaChart>
    );
  }

  // bar
  return (
    <BarChart data={data as Array<Record<string, unknown>>}>
      {axis}
      {series.map((s, i) => (
        <Bar
          key={s.key}
          dataKey={s.key}
          name={s.name ?? s.key}
          fill={s.color ?? colorAt(i)}
          radius={[4, 4, 0, 0]}
          isAnimationActive={false}
        />
      ))}
    </BarChart>
  );
}
