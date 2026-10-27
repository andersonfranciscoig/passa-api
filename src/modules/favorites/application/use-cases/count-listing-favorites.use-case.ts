import type { UseCase } from "../../../../shared/application/use-case";
import { FavoriteRepository } from "../../domain/repositories";

export class CountListingFavoritesUseCase implements UseCase<string, { count: number }> {
  constructor(private readonly favorites: FavoriteRepository) {}

  async execute(listingId: string) {
    return { count: await this.favorites.countByListing(listingId) };
  }
}
