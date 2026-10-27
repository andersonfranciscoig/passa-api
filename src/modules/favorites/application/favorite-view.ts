import type { Favorite } from "../domain/favorite";

export function toFavoriteView(favorite: Favorite) {
  return {
    userId: favorite.userId,
    listingId: favorite.listingId,
    createdAt: favorite.createdAt.toISOString(),
  };
}
