import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";

import { ApiZodBody } from "../../../../shared/presentation/http/api-zod";
import { ZodValidationPipe } from "../../../../shared/presentation/http/zod-validation.pipe";
import type { AccessTokenClaims } from "../../../identity/application/ports/access-token-issuer";
import { CurrentUser } from "../../../identity/presentation/http/decorators/current-user.decorator";
import { AuthGuard } from "../../../identity/presentation/http/guards/auth.guard";
import { OptionalAuthGuard } from "../../../identity/presentation/http/guards/optional-auth.guard";
import { GetListingInsightsUseCase } from "../../application/use-cases/get-listing-insights.use-case";
import { TrackListingEventUseCase } from "../../application/use-cases/track-listing-event.use-case";
import { insightsQuerySchema, listingEventSchema, type InsightsQuery, type ListingEventBody } from "./analytics.schemas";

@ApiTags("Estatísticas")
@Controller("listings")
export class ListingAnalyticsController {
  constructor(
    private readonly trackEvent: TrackListingEventUseCase,
    private readonly listingInsights: GetListingInsightsUseCase,
  ) {}

  @Post(":id/events")
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({ summary: "Registar impressão, visualização, WhatsApp ou partilha (público)" })
  @ApiZodBody(listingEventSchema)
  track(
    @CurrentUser() account: AccessTokenClaims | undefined,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(listingEventSchema)) body: ListingEventBody,
  ) {
    return this.trackEvent.execute({
      listingId: id,
      type: body.type,
      source: body.source,
      sessionId: body.sessionId,
      visitorId: body.visitorId,
      area: body.area,
      actorId: account?.sub,
    });
  }

  @Get(":id/insights")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Estatísticas de um anúncio (só o dono ou administração)" })
  @ApiQuery({ name: "days", required: false, type: Number })
  listing(
    @CurrentUser() account: AccessTokenClaims,
    @Param("id") id: string,
    @Query(new ZodValidationPipe(insightsQuerySchema)) query: InsightsQuery,
  ) {
    return this.listingInsights.execute({
      listingId: id,
      userId: account.sub,
      isAdmin: account.role === "ADMIN",
      days: query.days,
    });
  }
}
