import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../shared/infrastructure/database/prisma.service";

const MODES = ["sell", "rent", "exchange", "donate", "lend"] as const;
const STATUSES = ["draft", "published", "reserved", "completed", "archived", "removed"] as const;

@Injectable()
export class AdminInsightsService {
  constructor(private readonly prisma: PrismaService) {}

  async pilot() {
    const [users, listings, conversations, messages, openReports] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.listing.findMany({ select: { status: true, terms: true, sellerId: true, viewCount: true } }),
      this.prisma.conversation.count(),
      this.prisma.message.count(),
      this.prisma.report.count({ where: { status: "open" } }),
    ]);

    const listingsByStatus = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<(typeof STATUSES)[number], number>;
    const listingsByMode = Object.fromEntries(MODES.map((m) => [m, 0])) as Record<(typeof MODES)[number], number>;
    const sellerCounts = new Map<string, number>();
    let totalViews = 0;

    for (const l of listings) {
      if (l.status in listingsByStatus) listingsByStatus[l.status as (typeof STATUSES)[number]]++;
      totalViews += l.viewCount;
      if (l.status !== "draft") {
        const mode = (l.terms as { mode?: string }).mode;
        if (mode && mode in listingsByMode) listingsByMode[mode as (typeof MODES)[number]]++;
        sellerCounts.set(l.sellerId, (sellerCounts.get(l.sellerId) ?? 0) + 1);
      }
    }

    const nonDraft = listings.filter((l) => l.status !== "draft").length;
    return {
      users,
      listings: nonDraft,
      listingsByStatus,
      listingsByMode,
      activeSellers: sellerCounts.size,
      conversations,
      messages,
      openReports,
      totalViews,
      targets: [
        { label: "Anúncios reais", current: nonDraft, goal: 20 },
        { label: "Conversas iniciadas", current: conversations, goal: 5 },
        { label: "Vendedores que voltam a publicar", current: [...sellerCounts.values()].filter((n) => n > 1).length, goal: 3 },
      ],
    };
  }
}
