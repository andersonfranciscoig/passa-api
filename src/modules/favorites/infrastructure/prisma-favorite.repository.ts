import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { PrismaService } from "../../../shared/infrastructure/database/prisma.service";
import type { Favorite } from "../domain/favorite";
import type { FavoriteListingCatalog, FavoriteRepository } from "../domain/repositories";

const isUniqueViolation = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";

@Injectable()
export class PrismaFavoriteRepository implements FavoriteRepository {
  constructor(private readonly prisma: PrismaService) {}

  async find(userId: string, listingId: string) {
    const row = await this.prisma.favorite.findUnique({
      where: { userId_listingId: { userId, listingId } },
    });
    return row ? toDomain(row) : null;
  }

  async listByUser(userId: string) {
    const rows = await this.prisma.favorite.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toDomain);
  }

  async add(favorite: Favorite) {
    try {
      await this.prisma.favorite.create({
        data: { userId: favorite.userId, listingId: favorite.listingId, createdAt: favorite.createdAt },
      });
      return true;
    } catch (error) {
      if (isUniqueViolation(error)) return false;
      throw error;
    }
  }

  async remove(userId: string, listingId: string) {
    const result = await this.prisma.favorite.deleteMany({ where: { userId, listingId } });
    return result.count > 0;
  }

  async countByListing(listingId: string) {
    return this.prisma.favorite.count({ where: { listingId } });
  }
}

@Injectable()
export class PrismaFavoriteListingCatalog implements FavoriteListingCatalog {
  constructor(private readonly prisma: PrismaService) {}

  async find(id: string) {
    return this.prisma.listing.findUnique({
      where: { id },
      select: { id: true, sellerId: true, status: true },
    });
  }
}

function toDomain(row: { userId: string; listingId: string; createdAt: Date }): Favorite {
  return { userId: row.userId, listingId: row.listingId, createdAt: row.createdAt };
}
