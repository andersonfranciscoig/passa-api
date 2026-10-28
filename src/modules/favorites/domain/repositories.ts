import type { Favorite, ListingRef } from "./favorite";

export abstract class FavoriteRepository {
  abstract find(userId: string, listingId: string): Promise<Favorite | null>;
  abstract listByUser(userId: string): Promise<Favorite[]>;
  /** `true` se inseriu; `false` se o par já existia. */
  abstract add(favorite: Favorite): Promise<boolean>;
  /** `true` se removeu; `false` se não havia favorito. */
  abstract remove(userId: string, listingId: string): Promise<boolean>;
  abstract countByListing(listingId: string): Promise<number>;
}

export abstract class FavoriteListingCatalog {
  abstract find(id: string): Promise<ListingRef | null>;
}
