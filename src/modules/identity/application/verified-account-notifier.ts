import { Injectable, Logger } from "@nestjs/common";

import { PrismaService } from "../../../shared/infrastructure/database/prisma.service";
import { OutboundNotifications } from "../../mail/application/outbound-notifications";
import type { User } from "../domain/user";
import { userVerification } from "./user-view";

@Injectable()
export class VerifiedAccountNotifier {
  private readonly logger = new Logger(VerifiedAccountNotifier.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly outbound: OutboundNotifications,
  ) {}

  async ifBecameVerified(before: User, after: User) {
    try {
      const signals = await this.signals(after.id);
      if (userVerification(before, signals).verified) return;
      if (!userVerification(after, signals).verified) return;
      await this.outbound.accountVerified({ userName: after.displayName, userEmail: after.email });
    } catch (error) {
      this.logger.error("Falha a avaliar conta verificada", error instanceof Error ? error.stack : error);
    }
  }

  private async signals(userId: string) {
    const [publishedListings, moderatedListings] = await Promise.all([
      this.prisma.listing.count({ where: { sellerId: userId, status: { in: ["published", "reserved"] } } }),
      this.prisma.listing.count({ where: { sellerId: userId, status: "removed" } }),
    ]);
    return { publishedListings, moderatedListings };
  }
}
