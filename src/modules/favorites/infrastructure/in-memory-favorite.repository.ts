import type { Favorite, ListingRef } from "../domain/favorite";
import type { FavoriteListingCatalog, FavoriteRepository } from "../domain/repositories";

export class InMemoryFavoriteRepository implements FavoriteRepository {
  readonly items: Favorite[] = [];

  async find(userId: string, listingId: string) {
    return this.items.find((f) => f.userId === userId && f.listingId === listingId) ?? null;
  }

  async listByUser(userId: string) {
    return this.items.filter((f) => f.userId === userId);
  }

  async add(favorite: Favorite) {
    if (await this.find(favorite.userId, favorite.listingId)) return false;
    this.items.push(favorite);
    return true;
  }

  async remove(userId: string, listingId: string) {
    const i = this.items.findIndex((f) => f.userId === userId && f.listingId === listingId);
    if (i === -1) return false;
    this.items.splice(i, 1);
    return true;
  }

  async countByListing(listingId: string) {
    return this.items.filter((f) => f.listingId === listingId).length;
  }
}

export class InMemoryFavoriteListingCatalog implements FavoriteListingCatalog {
  constructor(readonly listings: ListingRef[] = []) {}

  async find(id: string) {
    return this.listings.find((l) => l.id === id) ?? null;
  }
}
