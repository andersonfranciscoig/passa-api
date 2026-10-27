import type { PeriodSummary } from "./insights";

export type AccessTier = "free" | "verified" | "pro";

export const INSIGHT_FEATURES = [
  "allMetrics",
  "comparison",
  "rates",
  "sources",
  "fullRanking",
  "funnel",
  "audience",
  "contactsSplit",
  "promotionEffect",
  "export",
] as const;
export type InsightFeature = (typeof INSIGHT_FEATURES)[number];

const VERIFIED: InsightFeature[] = ["allMetrics", "comparison", "rates", "sources", "fullRanking"];

export const TIER_FEATURES: Record<AccessTier, readonly InsightFeature[]> = {
  free: [],
  verified: VERIFIED,
  pro: INSIGHT_FEATURES,
};

export const TIER_PERIODS: Record<AccessTier, readonly number[]> = {
  free: [7],
  verified: [7, 14, 30],
  pro: [7, 14, 30, 90],
};

export const FREE_RANKING_LIMIT = 3;

export interface InsightsAccess {
  tier: AccessTier;
  features: readonly InsightFeature[];
  periods: readonly number[];
}

export function accessFor(tier: AccessTier): InsightsAccess {
  return { tier, features: TIER_FEATURES[tier], periods: TIER_PERIODS[tier] };
}

export const hasFeature = (a: InsightsAccess, f: InsightFeature) => a.features.includes(f);

export function redactSummary(s: PeriodSummary, a: InsightsAccess): PeriodSummary {
  const all = hasFeature(a, "allMetrics");
  const split = hasFeature(a, "contactsSplit");
  const audience = hasFeature(a, "audience");
  return {
    ...s,
    totals: {
      ...s.totals,
      impressions: all ? s.totals.impressions : 0,
      reach: all ? s.totals.reach : 0,
      shares: all ? s.totals.shares : 0,
      chats: split ? s.totals.chats : 0,
      whatsapp: split ? s.totals.whatsapp : 0,
      unsaves: split ? s.totals.unsaves : 0,
    },
    rates: hasFeature(a, "rates") ? s.rates : { clickThrough: null, saveRate: null, contactRate: null, engagement: null },
    series: s.series.map((p) => (all ? p : { ...p, impressions: 0, reach: 0, shares: 0 })),
    sources: hasFeature(a, "sources") ? s.sources : [],
    areas: audience ? s.areas : [],
    hours: audience ? s.hours : s.hours.map(() => 0),
    weekdays: audience ? s.weekdays : s.weekdays.map(() => 0),
  };
}

export function redactTotals<T extends PeriodSummary["totals"]>(totals: T, a: InsightsAccess): T {
  const all = hasFeature(a, "allMetrics");
  const split = hasFeature(a, "contactsSplit");
  return {
    ...totals,
    impressions: all ? totals.impressions : 0,
    reach: all ? totals.reach : 0,
    shares: all ? totals.shares : 0,
    chats: split ? totals.chats : 0,
    whatsapp: split ? totals.whatsapp : 0,
    unsaves: split ? totals.unsaves : 0,
  };
}

export function allowedPeriod(a: InsightsAccess, days: number): number {
  return a.periods.includes(days) ? days : Math.max(...a.periods.filter((p) => p <= days), a.periods[0]);
}
