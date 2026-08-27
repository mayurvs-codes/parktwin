"use client";

import { lazy, Suspense, type ComponentProps } from "react";
import { ChartSkeleton } from "./AnalyticsChart.impl";

/**
 * Public entry point for the Analytics chart primitive (Module 6 – Phase F).
 *
 * The Recharts-backed implementation lives in `AnalyticsChart.impl.tsx` and is
 * lazy-loaded so the charting library is code-split out of the analytics
 * route's initial bundle (Module 6 – Phase H1, bundle optimization). While the
 * chunk loads, a `ChartSkeleton` with the chart's footprint is shown. The API
 * (`AnalyticsChart` + `ChartSkeleton`) is unchanged for consumers.
 */

export { ChartSkeleton };

const AnalyticsChartImpl = lazy(() =>
  import("./AnalyticsChart.impl").then((m) => ({ default: m.AnalyticsChart }))
);

type AnalyticsChartComponentProps = ComponentProps<typeof AnalyticsChartImpl>;

export function AnalyticsChart(props: AnalyticsChartComponentProps) {
  return (
    <Suspense fallback={<ChartSkeleton height={props.height} />}>
      <AnalyticsChartImpl {...props} />
    </Suspense>
  );
}
