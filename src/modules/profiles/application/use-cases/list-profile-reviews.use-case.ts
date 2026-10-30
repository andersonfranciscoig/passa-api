import type { UseCase } from "../../../../shared/application/use-case";
import type { UserRepository } from "../../../identity/domain/repositories";
import { ratingSummary, RATING_VALUES } from "../../domain/profile";
import type { ProfileReviewRepository } from "../../domain/repositories";
import { requireVisibleProfile } from "../profile-access";
import { toReviewView, type ReviewView } from "../review-view";

export const REVIEWS_PAGE_SIZE_MAX = 50;
export const REVIEWS_PAGE_SIZE_DEFAULT = 10;

export interface ListProfileReviewsInput {
  profileUserId: string;
  page?: number;
  pageSize?: number;
}

export interface ProfileReviewsPage {
  items: ReviewView[];
  total: number;
  page: number;
  pageSize: number;
  average: number | null;
  distribution: Record<"1" | "2" | "3" | "4" | "5", number>;
}

export class ListProfileReviewsUseCase implements UseCase<ListProfileReviewsInput, ProfileReviewsPage> {
  constructor(
    private readonly users: UserRepository,
    private readonly reviews: ProfileReviewRepository,
  ) {}

  async execute(input: ListProfileReviewsInput): Promise<ProfileReviewsPage> {
    const user = await requireVisibleProfile(this.users, input.profileUserId);
    const page = Math.max(1, Math.floor(input.page ?? 1));
    const pageSize = Math.min(REVIEWS_PAGE_SIZE_MAX, Math.max(1, Math.floor(input.pageSize ?? REVIEWS_PAGE_SIZE_DEFAULT)));

    const [rows, distribution] = await Promise.all([
      this.reviews.listByProfile(user.id, { skip: (page - 1) * pageSize, take: pageSize }),
      this.reviews.distribution(user.id),
    ]);
    const summary = ratingSummary(distribution);

    return {
      items: rows.map(toReviewView),
      total: summary.count,
      page,
      pageSize,
      average: summary.average,
      distribution: Object.fromEntries(RATING_VALUES.map((v) => [String(v), distribution[v]])) as ProfileReviewsPage["distribution"],
    };
  }
}
