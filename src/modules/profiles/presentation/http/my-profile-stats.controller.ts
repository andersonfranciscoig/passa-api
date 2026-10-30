import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";

import { ZodValidationPipe } from "../../../../shared/presentation/http/zod-validation.pipe";
import type { AccessTokenClaims } from "../../../identity/application/ports/access-token-issuer";
import { CurrentUser } from "../../../identity/presentation/http/decorators/current-user.decorator";
import { AuthGuard } from "../../../identity/presentation/http/guards/auth.guard";
import { GetProfileStatsUseCase } from "../../application/use-cases/get-profile-stats.use-case";
import { profileStatsQuerySchema, type ProfileStatsQuery } from "./profiles.schemas";

@ApiTags("Perfis")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller("me")
export class MyProfileStatsController {
  constructor(private readonly stats: GetProfileStatsUseCase) {}

  @Get("profile-stats")
  @ApiOperation({ summary: "Visitas, gostos e avaliação do próprio perfil" })
  @ApiQuery({ name: "days", required: false, enum: [7, 30, 90], description: "Por omissão 30" })
  profileStats(
    @CurrentUser() account: AccessTokenClaims,
    @Query(new ZodValidationPipe(profileStatsQuerySchema)) query: ProfileStatsQuery,
  ) {
    return this.stats.execute({ userId: account.sub, days: query.days });
  }
}
