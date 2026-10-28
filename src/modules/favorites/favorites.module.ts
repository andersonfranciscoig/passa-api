import { Module } from "@nestjs/common";

import { Clock } from "../../shared/domain/clock";
import { provideUseCase } from "../../shared/infrastructure/provide";
import { AnalyticsModule } from "../analytics";
import { TrackListingEventUseCase } from "../analytics/application/use-cases/track-listing-event.use-case";
import { CountListingFavoritesUseCase } from "./application/use-cases/count-listing-favorites.use-case";
import { GetFavoriteStatusUseCase } from "./application/use-cases/get-favorite-status.use-case";
import { ListMyFavoritesUseCase } from "./application/use-cases/list-my-favorites.use-case";
import { SaveFavoriteUseCase } from "./application/use-cases/save-favorite.use-case";
import { UnfavoriteUseCase } from "./application/use-cases/unfavorite.use-case";
import { FavoriteListingCatalog, FavoriteRepository } from "./domain/repositories";
import { PrismaFavoriteListingCatalog, PrismaFavoriteRepository } from "./infrastructure/prisma-favorite.repository";
import { FavoritesController } from "./presentation/http/favorites.controller";
import { ListingFavoritesController } from "./presentation/http/listing-favorites.controller";

@Module({
  imports: [AnalyticsModule],
  controllers: [FavoritesController, ListingFavoritesController],
  providers: [
    { provide: FavoriteRepository, useClass: PrismaFavoriteRepository },
    { provide: FavoriteListingCatalog, useClass: PrismaFavoriteListingCatalog },
    provideUseCase(SaveFavoriteUseCase, [FavoriteRepository, FavoriteListingCatalog, TrackListingEventUseCase, Clock]),
    provideUseCase(UnfavoriteUseCase, [FavoriteRepository, FavoriteListingCatalog, TrackListingEventUseCase]),
    provideUseCase(ListMyFavoritesUseCase, [FavoriteRepository]),
    provideUseCase(GetFavoriteStatusUseCase, [FavoriteRepository]),
    provideUseCase(CountListingFavoritesUseCase, [FavoriteRepository]),
  ],
})
export class FavoritesModule {}
