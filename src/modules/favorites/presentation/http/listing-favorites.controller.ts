import { Controller, Delete, Get, HttpCode, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import type { AccessTokenClaims } from "../../../identity/application/ports/access-token-issuer";
import { CurrentUser } from "../../../identity/presentation/http/decorators/current-user.decorator";
import { AuthGuard } from "../../../identity/presentation/http/guards/auth.guard";
import { CountListingFavoritesUseCase } from "../../application/use-cases/count-listing-favorites.use-case";
import { GetFavoriteStatusUseCase } from "../../application/use-cases/get-favorite-status.use-case";
import { SaveFavoriteUseCase } from "../../application/use-cases/save-favorite.use-case";
import { UnfavoriteUseCase } from "../../application/use-cases/unfavorite.use-case";

@ApiTags("Favoritos")
@Controller("listings")
export class ListingFavoritesController {
  constructor(
    private readonly save: SaveFavoriteUseCase,
    private readonly unfavorite: UnfavoriteUseCase,
    private readonly status: GetFavoriteStatusUseCase,
    private readonly count: CountListingFavoritesUseCase,
  ) {}

  @Get(":id/favorite")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Saber se o anúncio está nos favoritos da conta atual" })
  isFavorite(@CurrentUser() account: AccessTokenClaims, @Param("id") id: string) {
    return this.status.execute({ userId: account.sub, listingId: id });
  }

  @Post(":id/favorite")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Guardar anúncio nos favoritos (idempotente)" })
  add(@CurrentUser() account: AccessTokenClaims, @Param("id") id: string) {
    return this.save.execute({ userId: account.sub, listingId: id });
  }

  @Delete(":id/favorite")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @HttpCode(204)
  @ApiOperation({ summary: "Remover anúncio dos favoritos (idempotente)" })
  async remove(@CurrentUser() account: AccessTokenClaims, @Param("id") id: string) {
    await this.unfavorite.execute({ userId: account.sub, listingId: id });
  }

  @Get(":id/favorites/count")
  @ApiOperation({ summary: "Quantas contas guardaram este anúncio" })
  favoritesCount(@Param("id") id: string) {
    return this.count.execute(id);
  }
}
