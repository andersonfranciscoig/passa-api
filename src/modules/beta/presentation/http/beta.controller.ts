import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import type { AccessTokenClaims } from "../../../identity/application/ports/access-token-issuer";
import { CurrentUser } from "../../../identity/presentation/http/decorators/current-user.decorator";
import { OptionalAuthGuard } from "../../../identity/presentation/http/guards/optional-auth.guard";
import { GetAccessUseCase } from "../../application/use-cases/get-access.use-case";
import { GetSettingsUseCase } from "../../application/use-cases/get-settings.use-case";

@ApiTags("Beta")
@Controller("beta")
export class BetaController {
  constructor(
    private readonly access: GetAccessUseCase,
    private readonly settings: GetSettingsUseCase,
  ) {}

  @Get("settings")
  @ApiOperation({ summary: "O beta está fechado ou aberto a todos" })
  currentSettings() {
    return this.settings.execute();
  }

  @Get("access")
  @UseGuards(OptionalAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "O visitante ou a conta atual pode usar a plataforma?" })
  currentAccess(@CurrentUser() account?: AccessTokenClaims) {
    return this.access.execute(
      account
        ? {
            id: account.sub,
            isAdmin: account.role === "ADMIN",
            email: account.email,
          }
        : null,
    );
  }
}
