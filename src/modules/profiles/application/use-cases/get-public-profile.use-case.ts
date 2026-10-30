import type { UseCase } from "../../../../shared/application/use-case";
import type { UserRepository } from "../../../identity/domain/repositories";
import { toPublicProfile } from "../../../identity/application/user-view";
import { ratingSummary } from "../../domain/profile";
import type { ProfileLikeRepository, ProfileListingCatalog, ProfileReviewRepository } from "../../domain/repositories";
import { requireVisibleProfile } from "../profile-access";
import { toReviewView, type ReviewView } from "../review-view";

export interface GetPublicProfileInput {
  profileUserId: string;
  viewerId?: string;
}

export type PublicProfileView = ReturnType<typeof toPublicProfile> & {
  lastSeenAt: string | null;
  rating: { average: number | null; count: number };
  likes: number;
  likedByMe: boolean;
  myReview: ReviewView | null;
  canReview: boolean;
};

export class GetPublicProfileUseCase implements UseCase<GetPublicProfileInput, PublicProfileView> {
  constructor(
    private readonly users: UserRepository,
    private readonly reviews: ProfileReviewRepository,
    private readonly likes: ProfileLikeRepository,
    private readonly listings: ProfileListingCatalog,
  ) {}

  async execute(input: GetPublicProfileInput): Promise<PublicProfileView> {
    const user = await requireVisibleProfile(this.users, input.profileUserId);
    const viewerId = input.viewerId;
    const isSelf = viewerId === user.id;

    const [signals, distribution, likes, likedByMe, myReview] = await Promise.all([
      this.listings.signals(user.id),
      this.reviews.distribution(user.id),
      this.likes.count(user.id),
      viewerId && !isSelf ? this.likes.exists(user.id, viewerId) : Promise.resolve(false),
      viewerId && !isSelf ? this.reviews.findByAuthor(user.id, viewerId) : Promise.resolve(null),
    ]);

    return {
      ...toPublicProfile(user, signals),
      lastSeenAt: user.lastSeenAt?.toISOString() ?? null,
      rating: ratingSummary(distribution),
      likes,
      likedByMe,
      myReview: myReview ? toReviewView(myReview) : null,
      canReview: !!viewerId && !isSelf && !myReview,
    };
  }
}
