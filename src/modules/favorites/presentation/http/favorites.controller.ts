import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import type { AccessTokenClaims } from "../../../identity/application/ports/access-token-issuer";
import { CurrentUser } from "../../../identity/presentation/http/decorators/current-user.decorator";
import { AuthGuard } from "../../../identity/presentation/http/guards/auth.guard";
import { ListMyFavoritesUseCase } from "../../application/use-cases/list-my-favorites.use-case";

@ApiTags("Favoritos")
@Controller("favorites")
export class FavoritesController {
  constructor(private readonly listMine: ListMyFavoritesUseCase) {}

  @Get("mine")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Anúncios guardados da conta atual" })
  mine(@CurrentUser() account: AccessTokenClaims) {
    return this.listMine.execute(account.sub);
  }
}
