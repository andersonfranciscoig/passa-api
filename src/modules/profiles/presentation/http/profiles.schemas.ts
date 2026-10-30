import { z } from "zod";

import { REVIEWS_PAGE_SIZE_DEFAULT, REVIEWS_PAGE_SIZE_MAX } from "../../application/use-cases/list-profile-reviews.use-case";
import { DEFAULT_PROFILE_STATS_DAYS, PROFILE_STATS_DAYS, REVIEW_COMMENT_MAX } from "../../domain/profile";

export const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(REVIEW_COMMENT_MAX).nullish(),
});

export type CreateReviewBody = z.infer<typeof createReviewSchema>;

export const reviewsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  // Acima do máximo, limita em vez de rejeitar.
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .default(REVIEWS_PAGE_SIZE_DEFAULT)
    .transform((n) => Math.min(n, REVIEWS_PAGE_SIZE_MAX)),
});

export type ReviewsQuery = z.infer<typeof reviewsQuerySchema>;

export const profileStatsQuerySchema = z.object({
  days: z.coerce
    .number()
    .int()
    .refine((n) => (PROFILE_STATS_DAYS as readonly number[]).includes(n), {
      message: `Escolha ${PROFILE_STATS_DAYS.join(", ")} dias.`,
    })
    .default(DEFAULT_PROFILE_STATS_DAYS),
});

export type ProfileStatsQuery = z.infer<typeof profileStatsQuerySchema>;
