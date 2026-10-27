import type { UseCase } from "../../../../shared/application/use-case";
import { FavoriteRepository } from "../../domain/repositories";

export interface GetFavoriteStatusInput {
  userId: string;
  listingId: string;
}

export class GetFavoriteStatusUseCase implements UseCase<GetFavoriteStatusInput, { favorited: boolean }> {
  constructor(private readonly favorites: FavoriteRepository) {}

  async execute(input: GetFavoriteStatusInput) {
    const favorite = await this.favorites.find(input.userId, input.listingId);
    return { favorited: favorite != null };
  }
}
