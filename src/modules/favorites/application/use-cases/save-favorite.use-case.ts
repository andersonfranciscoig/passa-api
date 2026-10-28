import type { UseCase } from "../../../../shared/application/use-case";
import type { Clock } from "../../../../shared/domain/clock";
import { TrackListingEventUseCase } from "../../../analytics/application/use-cases/track-listing-event.use-case";
import { FavoriteOwnListingError, FavoriteListingNotFoundError } from "../../domain/errors";
import { PUBLIC_LISTING_STATUSES, type Favorite } from "../../domain/favorite";
import { FavoriteListingCatalog, FavoriteRepository } from "../../domain/repositories";
import { toFavoriteView } from "../favorite-view";

export interface SaveFavoriteInput {
  userId: string;
  listingId: string;
}

export class SaveFavoriteUseCase implements UseCase<SaveFavoriteInput, ReturnType<typeof toFavoriteView>> {
  constructor(
    private readonly favorites: FavoriteRepository,
    private readonly listings: FavoriteListingCatalog,
    private readonly track: TrackListingEventUseCase,
    private readonly clock: Clock,
  ) {}

  async execute(input: SaveFavoriteInput) {
    const listing = await this.listings.find(input.listingId);
    if (!listing || !PUBLIC_LISTING_STATUSES.has(listing.status)) {
      throw new FavoriteListingNotFoundError();
    }
    if (listing.sellerId === input.userId) throw new FavoriteOwnListingError();

    const existing = await this.favorites.find(input.userId, input.listingId);
    if (existing) return toFavoriteView(existing);

    const favorite: Favorite = {
      userId: input.userId,
      listingId: input.listingId,
      createdAt: this.clock.now(),
    };
    const created = await this.favorites.add(favorite);
    if (created) {
      await this.track.execute({ listingId: input.listingId, type: "favorite", actorId: input.userId });
    }
    const stored = created ? favorite : ((await this.favorites.find(input.userId, input.listingId)) ?? favorite);
    return toFavoriteView(stored);
  }
}
