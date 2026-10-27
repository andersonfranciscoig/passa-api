import { Injectable } from "@nestjs/common";
import type { ListingDailyStats, Prisma } from "@prisma/client";

import { PrismaService } from "../../../shared/infrastructure/database/prisma.service";
import { listingView } from "../../admin/application/views";
import type { InsightsCatalog, InsightsListing, ListingSignals, PromotionWindow } from "../domain/repositories";
import {
  applyEvent,
  dayKeyFromDate,
  emptyDay,
  luandaDayKey,
  StatsRepository,
  toDayDate,
  type DailyStats,
  type RecordEventInput,
  type TrafficSource,
} from "../domain/stats";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PUBLIC = new Set(["published", "reserved"]);

@Injectable()
export class PrismaAnalyticsRepository extends StatsRepository implements InsightsCatalog {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findDay(listingId: string, day: string): Promise<DailyStats | null> {
    const row = await this.prisma.listingDailyStats.findUnique({
      where: { listingId_day: { listingId, day: toDayDate(day) } },
    });
    return row ? toStats(row) : null;
  }

  async saveDay(stats: DailyStats): Promise<void> {
    const data = toRow(stats);
    await this.prisma.listingDailyStats.upsert({
      where: { listingId_day: { listingId: stats.listingId, day: toDayDate(stats.day) } },
      create: data,
      update: {
        impressions: data.impressions,
        views: data.views,
        newViewers: data.newViewers,
        favorites: data.favorites,
        unfavorites: data.unfavorites,
        chats: data.chats,
        whatsapp: data.whatsapp,
        shares: data.shares,
        sources: data.sources,
        areas: data.areas,
        hours: data.hours,
      },
    });
  }

  async listByListings(listingIds: string[], fromDay: string, toDay: string): Promise<DailyStats[]> {
    if (!listingIds.length) return [];
    const rows = await this.prisma.listingDailyStats.findMany({
      where: {
        listingId: { in: listingIds },
        day: { gte: toDayDate(fromDay), lte: toDayDate(toDay) },
      },
    });
    return rows.map(toStats);
  }

  async markViewer(listingId: string, visitorId: string): Promise<boolean> {
    const created = await this.prisma.listingViewer.createMany({
      data: [{ listingId, visitorId: visitorId.slice(0, 64) }],
      skipDuplicates: true,
    });
    return created.count > 0;
  }

  async record(input: RecordEventInput): Promise<void> {
    const day = luandaDayKey(input.at);
    await this.prisma.$transaction(async (tx) => {
      const row = await tx.listingDailyStats.findUnique({
        where: { listingId_day: { listingId: input.listingId, day: toDayDate(day) } },
      });
      const current = row ? toStats(row) : emptyDay(input.listingId, input.sellerId, day);
      const next = applyEvent(current, input);
      const data = toRow(next);
      await tx.listingDailyStats.upsert({
        where: { listingId_day: { listingId: next.listingId, day: toDayDate(next.day) } },
        create: data,
        update: {
          impressions: data.impressions,
          views: data.views,
          newViewers: data.newViewers,
          favorites: data.favorites,
          unfavorites: data.unfavorites,
          chats: data.chats,
          whatsapp: data.whatsapp,
          shares: data.shares,
          sources: data.sources,
          areas: data.areas,
          hours: data.hours,
        },
      });
    });
  }

  async findListing(id: string): Promise<InsightsListing | null> {
    if (!UUID.test(id)) return null;
    const row = await this.prisma.listing.findUnique({ where: { id }, include: { images: true } });
    return row ? toListing(row) : null;
  }

  async listingsBySeller(sellerId: string): Promise<InsightsListing[]> {
    const rows = await this.prisma.listing.findMany({
      where: { sellerId },
      include: { images: true },
      orderBy: { updatedAt: "desc" },
    });
    return rows.map(toListing);
  }

  async promotionWindows(listingId: string): Promise<PromotionWindow[]> {
    const rows = await this.prisma.promotionRequest.findMany({
      where: {
        listingId,
        startsAt: { not: null },
        expiresAt: { not: null },
        OR: [{ status: { in: ["active", "expired"] } }, { status: "cancelled", approvedBy: { not: null } }],
      },
    });
    return rows
      .filter((r): r is typeof r & { startsAt: Date; expiresAt: Date } => !!r.startsAt && !!r.expiresAt)
      .map((r) => ({ startsAt: r.startsAt, expiresAt: r.expiresAt }));
  }

  async promotedCount(sellerId: string): Promise<number> {
    return this.prisma.promotionRequest.count({ where: { userId: sellerId, startsAt: { not: null } } });
  }

  async listingSignals(userId: string): Promise<ListingSignals> {
    const [publishedListings, moderatedListings] = await Promise.all([
      this.prisma.listing.count({ where: { sellerId: userId, status: { in: [...PUBLIC] } } }),
      this.prisma.listing.count({ where: { sellerId: userId, status: "removed" } }),
    ]);
    return { publishedListings, moderatedListings };
  }

  async hasActivePro(userId: string, now: Date): Promise<boolean> {
    const row = await this.prisma.subscription.findFirst({
      where: {
        userId,
        status: "active",
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    });
    return !!row;
  }
}

function toStats(row: ListingDailyStats): DailyStats {
  return {
    listingId: row.listingId,
    sellerId: row.sellerId,
    day: dayKeyFromDate(row.day),
    impressions: row.impressions,
    views: row.views,
    newViewers: row.newViewers,
    favorites: row.favorites,
    unfavorites: row.unfavorites,
    chats: row.chats,
    whatsapp: row.whatsapp,
    shares: row.shares,
    sources: (row.sources ?? {}) as Partial<Record<TrafficSource, number>>,
    areas: (row.areas ?? {}) as Record<string, number>,
    hours: (row.hours ?? {}) as Record<string, number>,
  };
}

function toRow(stats: DailyStats): Prisma.ListingDailyStatsUncheckedCreateInput {
  return {
    listingId: stats.listingId,
    sellerId: stats.sellerId,
    day: toDayDate(stats.day),
    impressions: stats.impressions,
    views: stats.views,
    newViewers: stats.newViewers,
    favorites: stats.favorites,
    unfavorites: stats.unfavorites,
    chats: stats.chats,
    whatsapp: stats.whatsapp,
    shares: stats.shares,
    sources: stats.sources as Prisma.InputJsonValue,
    areas: stats.areas as Prisma.InputJsonValue,
    hours: stats.hours as Prisma.InputJsonValue,
  };
}

function toListing(row: Parameters<typeof listingView>[0]): InsightsListing {
  return {
    id: row.id,
    sellerId: row.sellerId,
    status: row.status,
    createdAt: row.createdAt,
    publishedAt: row.publishedAt ?? undefined,
    card: listingView(row),
  };
}
