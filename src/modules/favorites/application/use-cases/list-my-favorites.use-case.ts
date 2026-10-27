import type { UseCase } from "../../../../shared/application/use-case";
import { FavoriteRepository } from "../../domain/repositories";
import { toFavoriteView } from "../favorite-view";

export class ListMyFavoritesUseCase implements UseCase<string, ReturnType<typeof toFavoriteView>[]> {
  constructor(private readonly favorites: FavoriteRepository) {}

  async execute(userId: string) {
    const list = await this.favorites.listByUser(userId);
    return list
      .slice()
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map(toFavoriteView);
  }
}
