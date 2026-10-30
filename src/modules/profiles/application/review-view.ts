import type { ProfileReviewWithAuthor } from "../domain/profile";

export interface ReviewView {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  author: { id: string; displayName: string; avatarUrl: string | null };
}

export function toReviewView(review: ProfileReviewWithAuthor): ReviewView {
  return {
    id: review.id,
    rating: review.rating,
    comment: review.comment,
    createdAt: review.createdAt.toISOString(),
    author: {
      id: review.author.id,
      displayName: review.author.displayName,
      avatarUrl: review.author.avatarUrl,
    },
  };
}
