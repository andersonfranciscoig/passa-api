import { hasFeature, type InsightsAccess } from "../domain/access";
import { METRICS, percentChange, summarize, type MetricKey, type PeriodSummary } from "../domain/insights";
import { dayRangeFromKey, LIFETIME_DAYS, luandaDayKey, previousEnd, type DailyStats } from "../domain/stats";

export interface Comparison {
  previous: PeriodSummary["totals"];
  change: Partial<Record<MetricKey, number | null>>;
}

export function insightWindows(now: Date, days: number) {
  const today = luandaDayKey(now);
  const current = dayRangeFromKey(today, days);
  return {
    current,
    previous: dayRangeFromKey(previousEnd(current[0]!), days),
    lifetime: dayRangeFromKey(today, LIFETIME_DAYS),
  };
}

export function comparePeriods(current: PeriodSummary, previous: PeriodSummary, access: InsightsAccess): Comparison {
  if (!hasFeature(access, "comparison")) {
    return {
      previous: { ...current.totals },
      change: Object.fromEntries(METRICS.map((k) => [k, undefined])) as Comparison["change"],
    };
  }
  return {
    previous: previous.totals,
    change: Object.fromEntries(METRICS.map((k) => [k, percentChange(current.totals[k], previous.totals[k])])) as Record<
      MetricKey,
      number | null
    >,
  };
}

export function summarizeWindow(rows: DailyStats[], days: string[]): PeriodSummary {
  return summarize(rows, days);
}
