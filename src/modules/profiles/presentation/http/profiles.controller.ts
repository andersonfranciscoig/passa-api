import { Body, Controller, Delete, Get, HttpCode, Logger, Param, Post, Put, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";

import { DomainError } from "../../../../shared/domain/domain-error";
import { ApiZodBody } from "../../../../shared/presentation/http/api-zod";
import { ZodValidationPipe } from "../../../../shared/presentation/http/zod-validation.pipe";
import type { AccessTokenClaims } from "../../../identity/application/ports/access-token-issuer";
import { CurrentUser } from "../../../identity/presentation/http/decorators/current-user.decorator";
import { AuthGuard } from "../../../identity/presentation/http/guards/auth.guard";
import { OptionalAuthGuard } from "../../../identity/presentation/http/guards/optional-auth.guard";
import { CreateProfileReviewUseCase } from "../../application/use-cases/create-profile-review.use-case";
import { GetPublicProfileUseCase } from "../../application/use-cases/get-public-profile.use-case";
import { LikeProfileUseCase, UnlikeProfileUseCase } from "../../application/use-cases/like-profile.use-case";
import { ListProfileReviewsUseCase } from "../../application/use-cases/list-profile-reviews.use-case";
import { RecordProfileViewUseCase } from "../../application/use-cases/record-profile-view.use-case";
import { createReviewSchema, reviewsQuerySchema, type CreateReviewBody, type ReviewsQuery } from "./profiles.schemas";

@ApiTags("Perfis")
@Controller("users")
export class ProfilesController {
  private readonly log = new Logger(ProfilesController.name);

  constructor(
    private readonly getProfile: GetPublicProfileUseCase,
    private readonly listReviews: ListProfileReviewsUseCase,
    private readonly createReview: CreateProfileReviewUseCase,
    private readonly like: LikeProfileUseCase,
    private readonly unlike: UnlikeProfileUseCase,
    private readonly recordView: RecordProfileViewUseCase,
  ) {}

  @Get(":id")
  @UseGuards(OptionalAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Perfil público (com avaliação média, gostos e última atividade)" })
  profile(@CurrentUser() account: AccessTokenClaims | undefined, @Param("id") id: string) {
    return this.getProfile.execute({ profileUserId: id, viewerId: account?.sub });
  }

  @Get(":id/reviews")
  @ApiOperation({ summary: "Avaliações do perfil, mais recentes primeiro" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number, description: "Máximo 50 (por omissão 10)" })
  reviews(@Param("id") id: string, @Query(new ZodValidationPipe(reviewsQuerySchema)) query: ReviewsQuery) {
    return this.listReviews.execute({ profileUserId: id, page: query.page, pageSize: query.pageSize });
  }

  @Post(":id/reviews")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Avaliar o perfil (1 a 5, uma vez por conta)" })
  @ApiZodBody(createReviewSchema, { rating: 5, comment: "Entrega rápida e artigo como descrito." })
  review(
    @CurrentUser() account: AccessTokenClaims,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(createReviewSchema)) body: CreateReviewBody,
  ) {
    return this.createReview.execute({ profileUserId: id, authorId: account.sub, rating: body.rating, comment: body.comment });
  }

  @Put(":id/like")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Gostar do perfil (idempotente)" })
  likeProfile(@CurrentUser() account: AccessTokenClaims, @Param("id") id: string) {
    return this.like.execute({ profileUserId: id, userId: account.sub });
  }

  @Delete(":id/like")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Retirar o gosto do perfil (idempotente)" })
  unlikeProfile(@CurrentUser() account: AccessTokenClaims, @Param("id") id: string) {
    return this.unlike.execute({ profileUserId: id, userId: account.sub });
  }

  @Post(":id/views")
  @UseGuards(OptionalAuthGuard)
  @HttpCode(204)
  @ApiOperation({ summary: "Registar uma visita ao perfil (uma por visitante e dia; o dono não conta)" })
  async view(@CurrentUser() account: AccessTokenClaims | undefined, @Param("id") id: string, @Req() request: Request) {
    try {
      await this.recordView.execute({
        profileUserId: id,
        viewerId: account?.sub,
        ip: clientIp(request),
        userAgent: request.headers["user-agent"],
      });
    } catch (error) {
      // Perfil inexistente continua a dar 404; uma falha ao contar nunca estraga a página.
      if (error instanceof DomainError) throw error;
      this.log.warn(`Visita ao perfil não registada: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

function clientIp(request: Request): string | undefined {
  const forwarded = request.headers["x-forwarded-for"];
  const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(",")[0]?.trim();
  return first || request.ip || request.socket?.remoteAddress || undefined;
}
