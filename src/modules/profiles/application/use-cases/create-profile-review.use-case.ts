import type { UseCase } from "../../../../shared/application/use-case";
import type { Clock } from "../../../../shared/domain/clock";
import type { IdGenerator } from "../../../../shared/domain/id-generator";
import { InvalidSessionError } from "../../../identity/domain/errors";
import type { UserRepository } from "../../../identity/domain/repositories";
import { CannotReviewOwnProfileError, ProfileAlreadyReviewedError } from "../../domain/errors";
import { normalizeComment, validateRating, type ProfileReviewWithAuthor } from "../../domain/profile";
import type { ProfileReviewRepository } from "../../domain/repositories";
import { requireVisibleProfile } from "../profile-access";
import { toReviewView, type ReviewView } from "../review-view";

export interface CreateProfileReviewInput {
  profileUserId: string;
  authorId: string;
  rating: number;
  comment?: string | null;
}

export class CreateProfileReviewUseCase implements UseCase<CreateProfileReviewInput, ReviewView> {
  constructor(
    private readonly users: UserRepository,
    private readonly reviews: ProfileReviewRepository,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
  ) {}

  async execute(input: CreateProfileReviewInput): Promise<ReviewView> {
    const profile = await requireVisibleProfile(this.users, input.profileUserId);
    if (profile.id === input.authorId) throw new CannotReviewOwnProfileError();

    const rating = validateRating(input.rating);
    const comment = normalizeComment(input.comment);

    const author = await this.users.findById(input.authorId);
    if (!author) throw new InvalidSessionError();

    if (await this.reviews.findByAuthor(profile.id, author.id)) throw new ProfileAlreadyReviewedError();

    const now = this.clock.now();
    const review: ProfileReviewWithAuthor = {
      id: this.ids.next(),
      profileUserId: profile.id,
      authorId: author.id,
      rating,
      comment,
      createdAt: now,
      updatedAt: now,
      author: { id: author.id, displayName: author.displayName, avatarUrl: author.avatarUrl ?? null },
    };
    // Corrida entre dois pedidos iguais: a unicidade na base de dados decide.
    if (!(await this.reviews.add(review))) throw new ProfileAlreadyReviewedError();
    return toReviewView(review);
  }
}
