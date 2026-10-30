import type { UserRepository } from "../../identity/domain/repositories";
import {
  emptyDistribution,
  type ProfileLike,
  type ProfileReview,
  type ProfileReviewWithAuthor,
  type RatingDistribution,
} from "../domain/profile";
import type {
  ProfileLikeRepository,
  ProfileListingCatalog,
  ProfileListingSignals,
  ProfileReviewRepository,
  ProfileViewRepository,
} from "../domain/repositories";

export class InMemoryProfileReviewRepository implements ProfileReviewRepository {
  readonly items: ProfileReview[] = [];

  constructor(private readonly users: UserRepository) {}

  async findByAuthor(profileUserId: string, authorId: string) {
    const row = this.items.find((r) => r.profileUserId === profileUserId && r.authorId === authorId);
    return row ? this.withAuthor(row) : null;
  }

  async add(review: ProfileReview) {
    if (this.items.some((r) => r.profileUserId === review.profileUserId && r.authorId === review.authorId)) return false;
    // Guardar só a linha (sem o autor embutido), como na base de dados.
    const { id, profileUserId, authorId, rating, comment, createdAt, updatedAt } = review;
    this.items.push({ id, profileUserId, authorId, rating, comment, createdAt, updatedAt });
    return true;
  }

  async listByProfile(profileUserId: string, page: { skip: number; take: number }) {
    const rows = this.items
      .filter((r) => r.profileUserId === profileUserId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(page.skip, page.skip + page.take);
    return Promise.all(rows.map((r) => this.withAuthor(r)));
  }

  async distribution(profileUserId: string): Promise<RatingDistribution> {
    const out = emptyDistribution();
    for (const r of this.items) if (r.profileUserId === profileUserId) out[r.rating] += 1;
    return out;
  }

  private async withAuthor(row: ProfileReview): Promise<ProfileReviewWithAuthor> {
    const user = await this.users.findById(row.authorId);
    return {
      ...row,
      author: { id: row.authorId, displayName: user?.displayName ?? "", avatarUrl: user?.avatarUrl ?? null },
    };
  }
}

export class InMemoryProfileLikeRepository implements ProfileLikeRepository {
  readonly items: ProfileLike[] = [];

  async add(like: ProfileLike) {
    if (await this.exists(like.profileUserId, like.userId)) return false;
    this.items.push(like);
    return true;
  }

  async remove(profileUserId: string, userId: string) {
    const i = this.items.findIndex((l) => l.profileUserId === profileUserId && l.userId === userId);
    if (i === -1) return false;
    this.items.splice(i, 1);
    return true;
  }

  async exists(profileUserId: string, userId: string) {
    return this.items.some((l) => l.profileUserId === profileUserId && l.userId === userId);
  }

  async count(profileUserId: string) {
    return this.items.filter((l) => l.profileUserId === profileUserId).length;
  }
}

export class InMemoryProfileViewRepository implements ProfileViewRepository {
  /** `${userId}|${viewerKey}|${day}` */
  readonly viewers = new Set<string>();
  readonly days = new Map<string, number>();

  async recordView(userId: string, viewerKey: string, day: string) {
    const key = `${userId}|${viewerKey}|${day}`;
    if (this.viewers.has(key)) return false;
    this.viewers.add(key);
    const dayKey = `${userId}|${day}`;
    this.days.set(dayKey, (this.days.get(dayKey) ?? 0) + 1);
    return true;
  }

  async dailyViews(userId: string, fromDay: string, toDay: string) {
    const out: { day: string; views: number }[] = [];
    for (const [key, views] of this.days) {
      const [id, day] = key.split("|");
      if (id === userId && day >= fromDay && day <= toDay) out.push({ day, views });
    }
    return out;
  }

  async uniqueViewers(userId: string, fromDay: string, toDay: string) {
    const keys = new Set<string>();
    for (const entry of this.viewers) {
      const [id, viewerKey, day] = entry.split("|");
      if (id === userId && day >= fromDay && day <= toDay) keys.add(viewerKey);
    }
    return keys.size;
  }
}

export class InMemoryProfileListingCatalog implements ProfileListingCatalog {
  constructor(readonly bySeller = new Map<string, ProfileListingSignals>()) {}

  async signals(userId: string) {
    return this.bySeller.get(userId) ?? { publishedListings: 0, moderatedListings: 0 };
  }
}
