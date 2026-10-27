import type { UseCase } from "../../../../shared/application/use-case";
import { TrackListingEventUseCase } from "../../../analytics/application/use-cases/track-listing-event.use-case";
import { FavoriteListingNotFoundError } from "../../domain/errors";
import { FavoriteListingCatalog, FavoriteRepository } from "../../domain/repositories";

export interface UnfavoriteInput {
  userId: string;
  listingId: string;
}

export class UnfavoriteUseCase implements UseCase<UnfavoriteInput, { removed: boolean }> {
  constructor(
    private readonly favorites: FavoriteRepository,
    private readonly listings: FavoriteListingCatalog,
    private readonly track: TrackListingEventUseCase,
  ) {}

  async execute(input: UnfavoriteInput) {
    const listing = await this.listings.find(input.listingId);
    if (!listing) throw new FavoriteListingNotFoundError();

    const removed = await this.favorites.remove(input.userId, input.listingId);
    if (removed) {
      await this.track.execute({ listingId: input.listingId, type: "unfavorite", actorId: input.userId });
    }
    return { removed };
  }
}
