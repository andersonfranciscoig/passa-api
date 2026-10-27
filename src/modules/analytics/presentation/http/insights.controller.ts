import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";

import { ZodValidationPipe } from "../../../../shared/presentation/http/zod-validation.pipe";
import type { AccessTokenClaims } from "../../../identity/application/ports/access-token-issuer";
import { CurrentUser } from "../../../identity/presentation/http/decorators/current-user.decorator";
import { AuthGuard } from "../../../identity/presentation/http/guards/auth.guard";
import { GetSellerInsightsUseCase } from "../../application/use-cases/get-seller-insights.use-case";
import { insightsQuerySchema, type InsightsQuery } from "./analytics.schemas";

@ApiTags("Estatísticas")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller("insights")
export class InsightsController {
  constructor(private readonly sellerInsights: GetSellerInsightsUseCase) {}

  @Get()
  @ApiOperation({ summary: "Painel de estatísticas do anunciante (já redactado ao plano)" })
  @ApiQuery({ name: "days", required: false, type: Number })
  seller(
    @CurrentUser() account: AccessTokenClaims,
    @Query(new ZodValidationPipe(insightsQuerySchema)) query: InsightsQuery,
  ) {
    return this.sellerInsights.execute({ userId: account.sub, isAdmin: account.role === "ADMIN", days: query.days });
  }
}
