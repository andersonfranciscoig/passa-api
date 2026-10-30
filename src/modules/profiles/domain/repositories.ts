import type { ProfileLike, ProfileReview, ProfileReviewWithAuthor, RatingDistribution } from "./profile";

export abstract class ProfileReviewRepository {
  abstract findByAuthor(profileUserId: string, authorId: string): Promise<ProfileReviewWithAuthor | null>;
  /** `true` se inseriu; `false` se o autor já tinha avaliado este perfil. */
  abstract add(review: ProfileReview): Promise<boolean>;
  /** Mais recentes primeiro. */
  abstract listByProfile(profileUserId: string, page: { skip: number; take: number }): Promise<ProfileReviewWithAuthor[]>;
  abstract distribution(profileUserId: string): Promise<RatingDistribution>;
}

export abstract class ProfileLikeRepository {
  /** `true` se inseriu; `false` se o par já existia. */
  abstract add(like: ProfileLike): Promise<boolean>;
  /** `true` se removeu; `false` se não havia gosto. */
  abstract remove(profileUserId: string, userId: string): Promise<boolean>;
  abstract exists(profileUserId: string, userId: string): Promise<boolean>;
  abstract count(profileUserId: string): Promise<number>;
}

export abstract class ProfileViewRepository {
  /**
   * Regista a visita de `viewerKey` ao perfil no dia (AAAA-MM-DD). Só conta uma vez por
   * visitante e dia; devolve `true` se contou. Atómico na implementação Prisma.
   */
  abstract recordView(userId: string, viewerKey: string, day: string): Promise<boolean>;
  abstract dailyViews(userId: string, fromDay: string, toDay: string): Promise<{ day: string; views: number }[]>;
  abstract uniqueViewers(userId: string, fromDay: string, toDay: string): Promise<number>;
}

export interface ProfileListingSignals {
  readonly publishedListings: number;
  readonly moderatedListings: number;
}

/** Sinais dos anúncios usados no selo de verificação do perfil público. */
export abstract class ProfileListingCatalog {
  abstract signals(userId: string): Promise<ProfileListingSignals>;
}
