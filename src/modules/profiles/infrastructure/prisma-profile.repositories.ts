import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { PrismaService } from "../../../shared/infrastructure/database/prisma.service";
import { dayKeyFromDate, toDayDate } from "../../analytics/domain/stats";
import {
  emptyDistribution,
  RATING_VALUES,
  type ProfileLike,
  type ProfileReview,
  type ProfileReviewWithAuthor,
  type RatingDistribution,
  type RatingValue,
} from "../domain/profile";
import type {
  ProfileLikeRepository,
  ProfileListingCatalog,
  ProfileReviewRepository,
  ProfileViewRepository,
} from "../domain/repositories";

const isUniqueViolation = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";

const AUTHOR = { select: { id: true, displayName: true, avatarUrl: true } } as const;

type ReviewRow = Prisma.ProfileReviewGetPayload<{ include: { author: typeof AUTHOR } }>;

function toReview(row: ReviewRow): ProfileReviewWithAuthor {
  return {
    id: row.id,
    profileUserId: row.profileUserId,
    authorId: row.authorId,
    rating: row.rating as RatingValue,
    comment: row.comment,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    author: { id: row.author.id, displayName: row.author.displayName, avatarUrl: row.author.avatarUrl },
  };
}

@Injectable()
export class PrismaProfileReviewRepository implements ProfileReviewRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByAuthor(profileUserId: string, authorId: string) {
    const row = await this.prisma.profileReview.findUnique({
      where: { profileUserId_authorId: { profileUserId, authorId } },
      include: { author: AUTHOR },
    });
    return row ? toReview(row) : null;
  }

  async add(review: ProfileReview) {
    try {
      await this.prisma.profileReview.create({
        data: {
          id: review.id,
          profileUserId: review.profileUserId,
          authorId: review.authorId,
          rating: review.rating,
          comment: review.comment,
          createdAt: review.createdAt,
          updatedAt: review.updatedAt,
        },
      });
      return true;
    } catch (error) {
      if (isUniqueViolation(error)) return false;
      throw error;
    }
  }

  async listByProfile(profileUserId: string, page: { skip: number; take: number }) {
    const rows = await this.prisma.profileReview.findMany({
      where: { profileUserId },
      include: { author: AUTHOR },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: page.skip,
      take: page.take,
    });
    return rows.map(toReview);
  }

  async distribution(profileUserId: string): Promise<RatingDistribution> {
    const groups = await this.prisma.profileReview.groupBy({
      by: ["rating"],
      where: { profileUserId },
      _count: { _all: true },
    });
    const out = emptyDistribution();
    for (const g of groups) {
      if ((RATING_VALUES as readonly number[]).includes(g.rating)) out[g.rating as RatingValue] = g._count._all;
    }
    return out;
  }
}

@Injectable()
export class PrismaProfileLikeRepository implements ProfileLikeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async add(like: ProfileLike) {
    const created = await this.prisma.profileLike.createMany({
      data: [{ profileUserId: like.profileUserId, userId: like.userId, createdAt: like.createdAt }],
      skipDuplicates: true,
    });
    return created.count > 0;
  }

  async remove(profileUserId: string, userId: string) {
    const result = await this.prisma.profileLike.deleteMany({ where: { profileUserId, userId } });
    return result.count > 0;
  }

  async exists(profileUserId: string, userId: string) {
    const row = await this.prisma.profileLike.findUnique({
      where: { profileUserId_userId: { profileUserId, userId } },
      select: { userId: true },
    });
    return !!row;
  }

  async count(profileUserId: string) {
    return this.prisma.profileLike.count({ where: { profileUserId } });
  }
}

@Injectable()
export class PrismaProfileViewRepository implements ProfileViewRepository {
  constructor(private readonly prisma: PrismaService) {}

  async recordView(userId: string, viewerKey: string, day: string) {
    const date = toDayDate(day);
    return this.prisma.$transaction(async (tx) => {
      const created = await tx.profileViewer.createMany({
        data: [{ userId, viewerKey: viewerKey.slice(0, 64), day: date }],
        skipDuplicates: true,
      });
      if (created.count === 0) return false;
      await tx.profileDailyStats.upsert({
        where: { userId_day: { userId, day: date } },
        create: { userId, day: date, views: 1 },
        update: { views: { increment: 1 } },
      });
      return true;
    });
  }

  async dailyViews(userId: string, fromDay: string, toDay: string) {
    const rows = await this.prisma.profileDailyStats.findMany({
      where: { userId, day: { gte: toDayDate(fromDay), lte: toDayDate(toDay) } },
      orderBy: { day: "asc" },
    });
    return rows.map((r) => ({ day: dayKeyFromDate(r.day), views: r.views }));
  }

  async uniqueViewers(userId: string, fromDay: string, toDay: string) {
    const [row] = await this.prisma.$queryRaw<{ count: bigint | number }[]>`
      SELECT COUNT(DISTINCT "viewer_key") AS count
      FROM "profile_viewers"
      WHERE "user_id" = ${userId}::uuid AND "day" BETWEEN ${fromDay}::date AND ${toDay}::date
    `;
    return Number(row?.count ?? 0);
  }
}

@Injectable()
export class PrismaProfileListingCatalog implements ProfileListingCatalog {
  constructor(private readonly prisma: PrismaService) {}

  async signals(userId: string) {
    const [publishedListings, moderatedListings] = await Promise.all([
      this.prisma.listing.count({ where: { sellerId: userId, status: { in: ["published", "reserved"] } } }),
      this.prisma.listing.count({ where: { sellerId: userId, status: "removed" } }),
    ]);
    return { publishedListings, moderatedListings };
  }
}
