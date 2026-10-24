import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { ApiZodBody } from "../../../../shared/presentation/http/api-zod";
import { ZodValidationPipe } from "../../../../shared/presentation/http/zod-validation.pipe";
import type { AccessTokenClaims } from "../../../identity/application/ports/access-token-issuer";
import { CurrentUser } from "../../../identity/presentation/http/decorators/current-user.decorator";
import { AdminGuard } from "../../../identity/presentation/http/guards/admin.guard";
import { AuthGuard } from "../../../identity/presentation/http/guards/auth.guard";
import { AdminMonetizationService } from "../../application/admin-monetization.service";
import {
  grantPromotionSchema,
  grantSubscriptionSchema,
  noteSchema,
  reasonSchema,
  refundSchema,
  savePlanSchema,
  settingsSchema,
  type GrantPromotionBody,
  type GrantSubscriptionBody,
  type NoteBody,
  type ReasonBody,
  type RefundBody,
  type SavePlanBody,
  type SettingsBody,
} from "./admin.schemas";

@ApiTags("Admin — Monetização")
@ApiBearerAuth()
@UseGuards(AuthGuard, AdminGuard)
@Controller("admin")
export class AdminMonetizationController {
  constructor(private readonly monetization: AdminMonetizationService) {}

  @Get("promotions")
  @ApiOperation({ summary: "Pedidos de destaque" })
  promotions() {
    return this.monetization.adminListRequests();
  }

  @Post("promotions/grant")
  @ApiZodBody(grantPromotionSchema)
  grantPromotion(
    @CurrentUser() account: AccessTokenClaims,
    @Body(new ZodValidationPipe(grantPromotionSchema)) body: GrantPromotionBody,
  ) {
    return this.monetization.grantPromotion(account.sub, body.listingId, body.planId, body);
  }

  @Post("promotions/:id/approve")
  @ApiZodBody(noteSchema)
  approvePromotion(
    @CurrentUser() account: AccessTokenClaims,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(noteSchema)) body: NoteBody,
  ) {
    return this.monetization.approveRequest(id, account.sub, body);
  }

  @Post("promotions/:id/reject")
  @ApiZodBody(reasonSchema)
  rejectPromotion(
    @CurrentUser() account: AccessTokenClaims,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(reasonSchema)) body: ReasonBody,
  ) {
    return this.monetization.rejectRequest(id, account.sub, body.reason ?? body.note ?? "");
  }

  @Post("promotions/:id/end")
  @ApiZodBody(reasonSchema)
  endPromotion(
    @CurrentUser() account: AccessTokenClaims,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(reasonSchema)) body: ReasonBody,
  ) {
    return this.monetization.endPromotion(id, account.sub, body.reason ?? body.note ?? "");
  }

  @Get("plans")
  listPlans() {
    return this.monetization.adminListPlans();
  }

  @Post("plans")
  @ApiZodBody(savePlanSchema)
  savePlan(
    @CurrentUser() account: AccessTokenClaims,
    @Body(new ZodValidationPipe(savePlanSchema)) body: SavePlanBody,
  ) {
    return this.monetization.savePlan(account.sub, body.id ?? null, body);
  }

  @Get("monetization/settings")
  settings() {
    return this.monetization.getSettings();
  }

  @Patch("monetization/settings")
  @ApiZodBody(settingsSchema)
  updateSettings(
    @CurrentUser() account: AccessTokenClaims,
    @Body(new ZodValidationPipe(settingsSchema)) body: SettingsBody,
  ) {
    return this.monetization.updateSettings(account.sub, body);
  }

  @Get("monetization/audit")
  audit() {
    return this.monetization.auditLog();
  }

  @Get("monetization/metrics")
  metrics() {
    return this.monetization.metrics();
  }

  @Get("payments")
  payments() {
    return this.monetization.adminListPayments();
  }

  @Post("payments/:id/refund")
  @ApiZodBody(refundSchema)
  refund(
    @CurrentUser() account: AccessTokenClaims,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(refundSchema)) body: RefundBody,
  ) {
    return this.monetization.refund(id, account.sub, body.reason ?? "");
  }

  @Get("subscriptions")
  subscriptions() {
    return this.monetization.adminListSubscriptions();
  }

  @Post("subscriptions/grant")
  @ApiZodBody(grantSubscriptionSchema)
  grantSub(
    @CurrentUser() account: AccessTokenClaims,
    @Body(new ZodValidationPipe(grantSubscriptionSchema)) body: GrantSubscriptionBody,
  ) {
    return this.monetization.grantSubscription(account.sub, body.userId, body);
  }

  @Post("subscriptions/:id/approve")
  @ApiZodBody(noteSchema)
  approveSub(
    @CurrentUser() account: AccessTokenClaims,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(noteSchema)) body: NoteBody,
  ) {
    return this.monetization.approveSubscription(id, account.sub, body);
  }

  @Post("subscriptions/:id/reject")
  @ApiZodBody(reasonSchema)
  rejectSub(
    @CurrentUser() account: AccessTokenClaims,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(reasonSchema)) body: ReasonBody,
  ) {
    return this.monetization.rejectSubscription(id, account.sub, body.reason ?? body.note ?? "");
  }

  @Post("subscriptions/:id/revoke")
  @ApiZodBody(reasonSchema)
  revokeSub(
    @CurrentUser() account: AccessTokenClaims,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(reasonSchema)) body: ReasonBody,
  ) {
    return this.monetization.revokeSubscription(id, account.sub, body.reason ?? body.note ?? "");
  }

}
