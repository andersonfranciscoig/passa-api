import type { UseCase } from "../../../../shared/application/use-case";
import type { Clock } from "../../../../shared/domain/clock";
import { dayRangeFromKey, luandaDayKey } from "../../../analytics/domain/stats";
import { normalizeStatsDays, ratingSummary } from "../../domain/profile";
import type { ProfileLikeRepository, ProfileReviewRepository, ProfileViewRepository } from "../../domain/repositories";

export interface GetProfileStatsInput {
  userId: string;
  days?: number;
}

export interface ProfileStatsView {
  days: number;
  totalViews: number;
  uniqueViewers: number;
  /** Um registo por dia (AAAA-MM-DD, Africa/Luanda), do mais antigo para o mais recente, com zeros. */
  daily: { day: string; views: number }[];
  likes: number;
  rating: { average: number | null; count: number };
}

/** Estatísticas do próprio perfil (visitas, gostos e avaliações). */
export class GetProfileStatsUseCase implements UseCase<GetProfileStatsInput, ProfileStatsView> {
  constructor(
    private readonly views: ProfileViewRepository,
    private readonly likes: ProfileLikeRepository,
    private readonly reviews: ProfileReviewRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: GetProfileStatsInput): Promise<ProfileStatsView> {
    const days = normalizeStatsDays(input.days);
    const range = dayRangeFromKey(luandaDayKey(this.clock.now()), days);
    const from = range[0];
    const to = range[range.length - 1];

    const [rows, uniqueViewers, likes, distribution] = await Promise.all([
      this.views.dailyViews(input.userId, from, to),
      this.views.uniqueViewers(input.userId, from, to),
      this.likes.count(input.userId),
      this.reviews.distribution(input.userId),
    ]);

    const byDay = new Map(rows.map((r) => [r.day, r.views]));
    const daily = range.map((day) => ({ day, views: byDay.get(day) ?? 0 }));
    return {
      days,
      totalViews: daily.reduce((sum, d) => sum + d.views, 0),
      uniqueViewers,
      daily,
      likes,
      rating: ratingSummary(distribution),
    };
  }
}
