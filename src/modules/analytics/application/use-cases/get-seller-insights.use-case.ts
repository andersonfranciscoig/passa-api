import type { UseCase } from "../../../../shared/application/use-case";
import type { Clock } from "../../../../shared/domain/clock";
import type { UserRepository } from "../../../identity/domain/repositories";
import { accessFor, allowedPeriod, FREE_RANKING_LIMIT, hasFeature, redactSummary } from "../../domain/access";
import { sellerMilestones, type Milestone, type PeriodSummary } from "../../domain/insights";
import { InsightsCatalog, type InsightsListingCard } from "../../domain/repositories";
import { DEFAULT_INSIGHT_DAYS, StatsRepository } from "../../domain/stats";
import { resolveInsightsAccess } from "../insights-access";
import { comparePeriods, insightWindows, summarizeWindow, type Comparison } from "../insights-query";

export interface GetSellerInsightsInput {
  userId: string;
  isAdmin: boolean;
  days?: number;
}

export interface SellerInsightsView {
  access: ReturnType<typeof accessFor>;
  days: number;
  rankingTotal: number;
  current: PeriodSummary;
  comparison: Comparison;
  ranking: {
    listing: InsightsListingCard;
    views: number;
    saves: number;
    contacts: number;
    clickThrough: number | null;
  }[];
  milestones: Milestone[];
  activeListings: number;
}

export class GetSellerInsightsUseCase implements UseCase<GetSellerInsightsInput, SellerInsightsView> {
  constructor(
    private readonly stats: StatsRepository,
    private readonly catalog: InsightsCatalog,
    private readonly users: UserRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: GetSellerInsightsInput): Promise<SellerInsightsView> {
    const access = await resolveInsightsAccess(input.userId, input.isAdmin, this.catalog, this.users, this.clock);
    const days = allowedPeriod(access, input.days ?? DEFAULT_INSIGHT_DAYS);
    const listings = await this.catalog.listingsBySeller(input.userId);
    const windows = insightWindows(this.clock.now(), days);
    const ids = listings.map((l) => l.id);
    const rows = ids.length ? await this.stats.listByListings(ids, windows.lifetime[0]!, windows.current.at(-1)!) : [];

    const current = summarizeWindow(rows, windows.current);
    const lifetime = summarizeWindow(rows, windows.lifetime).totals;
    const rates = hasFeature(access, "rates");
    const ranking = listings
      .filter((l) => l.status !== "draft")
      .map((listing) => {
        const s = summarizeWindow(
          rows.filter((r) => r.listingId === listing.id),
          windows.current,
        );
        return {
          listing: listing.card,
          views: s.totals.views,
          saves: s.totals.saves,
          contacts: s.totals.contacts,
          clickThrough: rates ? s.rates.clickThrough : null,
        };
      })
      .sort((a, b) => b.views - a.views);

    return {
      access,
      days,
      rankingTotal: ranking.length,
      current: redactSummary(current, access),
      comparison: comparePeriods(current, summarizeWindow(rows, windows.previous), access),
      ranking: hasFeature(access, "fullRanking") ? ranking : ranking.slice(0, FREE_RANKING_LIMIT),
      activeListings: listings.filter((l) => l.status === "published" || l.status === "reserved").length,
      milestones: sellerMilestones({
        published: listings.filter((l) => l.status !== "draft").length,
        completed: listings.filter((l) => l.status === "completed").length,
        promoted: await this.catalog.promotedCount(input.userId),
        views: lifetime.views,
        saves: lifetime.saves,
        contacts: lifetime.contacts,
      }),
    };
  }
}
