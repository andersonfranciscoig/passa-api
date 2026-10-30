import { InvalidRatingError, InvalidReviewCommentError } from "./errors";

export const RATING_VALUES = [1, 2, 3, 4, 5] as const;
export type RatingValue = (typeof RATING_VALUES)[number];

export const REVIEW_COMMENT_MAX = 500;
export const PROFILE_STATS_DAYS = [7, 30, 90] as const;
export const DEFAULT_PROFILE_STATS_DAYS = 30;

export interface ProfileReview {
  readonly id: string;
  readonly profileUserId: string;
  readonly authorId: string;
  readonly rating: RatingValue;
  readonly comment: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface ReviewAuthor {
  readonly id: string;
  readonly displayName: string;
  readonly avatarUrl: string | null;
}

export interface ProfileReviewWithAuthor extends ProfileReview {
  readonly author: ReviewAuthor;
}

export interface ProfileLike {
  readonly profileUserId: string;
  readonly userId: string;
  readonly createdAt: Date;
}

/** Contagem de avaliações por estrela. */
export type RatingDistribution = Record<RatingValue, number>;

export function emptyDistribution(): RatingDistribution {
  return { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
}

export function validateRating(value: unknown): RatingValue {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 5) {
    throw new InvalidRatingError();
  }
  return value as RatingValue;
}

/** Comentário opcional: aparado; vazio passa a null; máximo de 500 caracteres. */
export function normalizeComment(value: string | null | undefined): string | null {
  const comment = value?.trim() ?? "";
  if (!comment) return null;
  if (comment.length > REVIEW_COMMENT_MAX) throw new InvalidReviewCommentError();
  return comment;
}

export function ratingSummary(distribution: RatingDistribution): { average: number | null; count: number } {
  let count = 0;
  let sum = 0;
  for (const value of RATING_VALUES) {
    count += distribution[value];
    sum += distribution[value] * value;
  }
  return { average: count ? Math.round((sum / count) * 10) / 10 : null, count };
}

export function normalizeStatsDays(days: number | undefined): number {
  return (PROFILE_STATS_DAYS as readonly number[]).includes(days ?? NaN) ? (days as number) : DEFAULT_PROFILE_STATS_DAYS;
}
