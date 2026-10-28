import type { UseCase } from "../../../../shared/application/use-case";
import type { Clock } from "../../../../shared/domain/clock";
import type { UserRepository } from "../../../identity/domain/repositories";
import { accessFor, allowedPeriod, hasFeature, redactSummary } from "../../domain/access";
import { listingMilestones, type Milestone, type PeriodSummary } from "../../domain/insights";
import { InsightsForbiddenError, InsightsNotFoundError } from "../../domain/errors";
import { InsightsCatalog, type InsightsListingCard } from "../../domain/repositories";
import { daysInclusive, DEFAULT_INSIGHT_DAYS, luandaDayKey, StatsRepository, type DailyStats } from "../../domain/stats";
import { resolveInsightsAccess } from "../insights-access";
import { comparePeriods, insightWindows, summarizeWindow, type Comparison } from "../insights-query";

export interface GetListingInsightsInput {
  listingId: string;
  userId: string;
  isAdmin: boolean;
  days?: number;
}

export interface ListingInsightsView {
  access: ReturnType<typeof accessFor>;
  days: number;
  listing: InsightsListingCard;
  current: PeriodSummary;
  comparison: Comparison;
  lifetime: PeriodSummary["totals"];
  milestones: Milestone[];
  promotion: { promotedDailyViews: number; organicDailyViews: number; promotedDays: number } | null;
  promotionWindows: { startsAt: string; expiresAt: string }[];
}

export class GetListingInsightsUseCase implements UseCase<GetListingInsightsInput, ListingInsightsView> {
  constructor(
    private readonly stats: StatsRepository,
    private readonly catalog: InsightsCatalog,
    private readonly users: UserRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: GetListingInsightsInput): Promise<ListingInsightsView> {
    const listing = await this.catalog.findListing(input.listingId);
    if (!listing) throw new InsightsNotFoundError();
    if (listing.sellerId !== input.userId && !input.isAdmin) throw new InsightsForbiddenError();

    const access = await resolveInsightsAccess(input.userId, input.isAdmin, this.catalog, this.users, this.clock);
    const days = allowedPeriod(access, input.days ?? DEFAULT_INSIGHT_DAYS);
    const now = this.clock.now();
    const windows = insightWindows(now, days);
    const rows = await this.stats.listByListings([listing.id], windows.lifetime[0]!, windows.current.at(-1)!);
    const current = summarizeWindow(rows, windows.current);
    const lifetime = summarizeWindow(rows, windows.lifetime).totals;
    const promoWindows = await this.catalog.promotionWindows(listing.id);

    return {
      access,
      days,
      listing: listing.card,
      current: redactSummary(current, access),
      comparison: comparePeriods(current, summarizeWindow(rows, windows.previous), access),
      lifetime,
      milestones: listingMilestones(lifetime),
      promotion: hasFeature(access, "promotionEffect")
        ? await this.promotion(promoWindows, listing.publishedAt ?? listing.createdAt, rows, windows.lifetime, now)
        : null,
      promotionWindows: hasFeature(access, "promotionEffect")
        ? promoWindows.map((w) => ({ startsAt: w.startsAt.toISOString(), expiresAt: w.expiresAt.toISOString() }))
        : [],
    };
  }

  private async promotion(
    windows: { startsAt: Date; expiresAt: Date }[],
    sinceAt: Date,
    rows: DailyStats[],
    lifetimeDays: string[],
    now: Date,
  ): Promise<ListingInsightsView["promotion"]> {
    if (!windows.length) return null;

    const promotedDays = new Set<string>();
    for (const w of windows) {
      const start = luandaDayKey(w.startsAt);
      const end = luandaDayKey(w.expiresAt < now ? w.expiresAt : now);
      for (const day of daysInclusive(start, end)) promotedDays.add(day);
    }
    if (!promotedDays.size) return null;

    const since = luandaDayKey(sinceAt);
    const active = rows.filter((r) => r.day >= since);
    const promoted = active.filter((r) => promotedDays.has(r.day));
    const organic = active.filter((r) => !promotedDays.has(r.day));
    const avg = (list: DailyStats[], n: number) => (n ? list.reduce((a, r) => a + r.views, 0) / n : 0);
    const organicDays = Math.max(1, lifetimeDays.filter((d) => d >= since && !promotedDays.has(d)).length);

    return {
      promotedDays: promotedDays.size,
      promotedDailyViews: avg(promoted, promotedDays.size),
      organicDailyViews: avg(organic, organicDays),
    };
  }
}
