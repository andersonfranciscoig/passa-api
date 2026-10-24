import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { ApiZodBody } from "../../../../shared/presentation/http/api-zod";
import { ZodValidationPipe } from "../../../../shared/presentation/http/zod-validation.pipe";
import type { AccessTokenClaims } from "../../../identity/application/ports/access-token-issuer";
import { CurrentUser } from "../../../identity/presentation/http/decorators/current-user.decorator";
import { AdminGuard } from "../../../identity/presentation/http/guards/admin.guard";
import { AuthGuard } from "../../../identity/presentation/http/guards/auth.guard";
import { AdminModerationService } from "../../application/admin-moderation.service";
import {
  reportBodySchema,
  resolveReportSchema,
  type ReportBody,
  type ResolveReportBody,
} from "./admin.schemas";

@ApiTags("Denúncias")
@Controller()
export class AdminModerationController {
  constructor(private readonly moderation: AdminModerationService) {}

  @Post("reports")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Denunciar um anúncio" })
  @ApiZodBody(reportBodySchema)
  file(@CurrentUser() account: AccessTokenClaims, @Body(new ZodValidationPipe(reportBodySchema)) body: ReportBody) {
    return this.moderation.file({ reporterId: account.sub, listingId: body.listingId, reason: body.reason, details: body.details });
  }

  @Get("admin/reports")
  @UseGuards(AuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Listar denúncias" })
  list() {
    return this.moderation.list();
  }

  @Post("admin/reports/:id/resolve")
  @UseGuards(AuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Arquivar denúncia ou remover o anúncio" })
  @ApiZodBody(resolveReportSchema)
  resolve(
    @CurrentUser() account: AccessTokenClaims,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(resolveReportSchema)) body: ResolveReportBody,
  ) {
    return this.moderation.resolve({ reportId: id, adminId: account.sub, decision: body.decision, note: body.note });
  }
}
