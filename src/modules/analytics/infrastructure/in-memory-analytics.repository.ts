import type { InsightsCatalog, InsightsListing, ListingSignals, PromotionWindow } from "../domain/repositories";
import { applyEvent, emptyDay, luandaDayKey, StatsRepository, type DailyStats, type RecordEventInput } from "../domain/stats";

export class InMemoryAnalyticsRepository extends StatsRepository implements InsightsCatalog {
  readonly days: DailyStats[] = [];
  readonly viewers = new Set<string>();
  readonly listings: InsightsListing[] = [];
  readonly windows = new Map<string, PromotionWindow[]>();
  readonly proUsers = new Set<string>();
  readonly promotions = new Map<string, number>();

  async findDay(listingId: string, day: string) {
    return this.days.find((r) => r.listingId === listingId && r.day === day) ?? null;
  }

  async saveDay(stats: DailyStats) {
    const i = this.days.findIndex((r) => r.listingId === stats.listingId && r.day === stats.day);
    if (i === -1) this.days.push(stats);
    else this.days[i] = stats;
  }

  async listByListings(listingIds: string[], fromDay: string, toDay: string) {
    const ids = new Set(listingIds);
    return this.days.filter((r) => ids.has(r.listingId) && r.day >= fromDay && r.day <= toDay);
  }

  async markViewer(listingId: string, visitorId: string) {
    const key = `${listingId}:${visitorId}`;
    if (this.viewers.has(key)) return false;
    this.viewers.add(key);
    return true;
  }

  async record(input: RecordEventInput) {
    const day = luandaDayKey(input.at);
    const current = (await this.findDay(input.listingId, day)) ?? emptyDay(input.listingId, input.sellerId, day);
    await this.saveDay(applyEvent(current, input));
  }

  async findListing(id: string) {
    return this.listings.find((l) => l.id === id) ?? null;
  }

  async listingsBySeller(sellerId: string) {
    return this.listings.filter((l) => l.sellerId === sellerId);
  }

  async promotionWindows(listingId: string) {
    return this.windows.get(listingId) ?? [];
  }

  async promotedCount(sellerId: string) {
    return this.promotions.get(sellerId) ?? 0;
  }

  async listingSignals(userId: string): Promise<ListingSignals> {
    const mine = this.listings.filter((l) => l.sellerId === userId);
    return {
      publishedListings: mine.filter((l) => l.status === "published" || l.status === "reserved").length,
      moderatedListings: mine.filter((l) => l.status === "removed").length,
    };
  }

  async hasActivePro(userId: string) {
    return this.proUsers.has(userId);
  }
}
