import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";

import { ApiZodBody } from "../../../../shared/presentation/http/api-zod";
import { ZodValidationPipe } from "../../../../shared/presentation/http/zod-validation.pipe";
import type { AccessTokenClaims } from "../../../identity/application/ports/access-token-issuer";
import { CurrentUser } from "../../../identity/presentation/http/decorators/current-user.decorator";
import { AuthGuard } from "../../../identity/presentation/http/guards/auth.guard";
import { AdminMonetizationService } from "../../application/admin-monetization.service";
import {
  featuredQuerySchema,
  requestPromotionSchema,
  simulatePaymentSchema,
  type FeaturedQuery,
  type RequestPromotionBody,
  type SimulatePaymentBody,
} from "./admin.schemas";

@ApiTags("Planos")
@Controller("plans")
export class PlansController {
  constructor(private readonly monetization: AdminMonetizationService) {}

  @Get()
  @ApiOperation({ summary: "Planos activos (destaque e Pro)" })
  list() {
    return this.monetization.listPlansPublic();
  }
}

@ApiTags("Monetização")
@Controller("monetization")
export class MonetizationSettingsController {
  constructor(private readonly monetization: AdminMonetizationService) {}

  @Get("settings")
  @ApiOperation({ summary: "Definições públicas de destaques e pagamentos" })
  settings() {
    return this.monetization.getSettings();
  }
}

@ApiTags("Destaques")
@Controller("promotions")
export class PromotionsController {
  constructor(private readonly monetization: AdminMonetizationService) {}

  @Get("featured")
  @ApiOperation({ summary: "IDs com destaque activo agora (home, pesquisa ou categoria)" })
  @ApiQuery({ name: "mode", required: false, enum: ["home", "search", "category"] })
  @ApiQuery({ name: "category", required: false })
  @ApiQuery({ name: "q", required: false })
  @ApiQuery({ name: "limit", required: false, type: Number })
  featured(@Query(new ZodValidationPipe(featuredQuerySchema)) query: FeaturedQuery) {
    return this.monetization.featuredListingIds(query);
  }

  @Get("mine")
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: "Pedidos de destaque da conta actual" })
  mine(@CurrentUser() account: AccessTokenClaims) {
    return this.monetization.listMinePromotions(account.sub);
  }

  @Get("windows/:listingId")
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: "Janelas de destaque de um anúncio (dono ou admin)" })
  windows(@CurrentUser() account: AccessTokenClaims, @Param("listingId") listingId: string) {
    return this.monetization.windowsFor(listingId, account.sub, account.role === "ADMIN");
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: "Pedir destaque: gratuito no piloto, ou com referência se a cobrança estiver activa" })
  @ApiZodBody(requestPromotionSchema)
  request(
    @CurrentUser() account: AccessTokenClaims,
    @Body(new ZodValidationPipe(requestPromotionSchema)) body: RequestPromotionBody,
  ) {
    return this.monetization.requestPromotion(account.sub, body.listingId, body.planId);
  }

  @Post(":id/cancel")
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: "Cancelar um pedido pendente" })
  cancel(@CurrentUser() account: AccessTokenClaims, @Param("id") id: string) {
    return this.monetization.cancelRequest(account.sub, id);
  }
}

@ApiTags("Pagamentos")
@Controller("payments")
export class PaymentsController {
  constructor(private readonly monetization: AdminMonetizationService) {}

  @Post("sandbox/simulate")
  @ApiOperation({ summary: "Simulador Multicaixa Express (ambiente de testes)" })
  @ApiZodBody(simulatePaymentSchema)
  simulate(@Body(new ZodValidationPipe(simulatePaymentSchema)) body: SimulatePaymentBody) {
    return this.monetization.simulateSandboxPayment(body);
  }

  @Get("mine")
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: "Pagamentos da conta actual" })
  mine(@CurrentUser() account: AccessTokenClaims) {
    return this.monetization.listMinePayments(account.sub);
  }

  @Get(":id")
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: "Um pagamento da conta" })
  get(@CurrentUser() account: AccessTokenClaims, @Param("id") id: string) {
    return this.monetization.getPayment(account.sub, id, account.role === "ADMIN");
  }

  @Post(":id/cancel")
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: "Cancelar um pagamento pendente" })
  cancel(@CurrentUser() account: AccessTokenClaims, @Param("id") id: string) {
    return this.monetization.cancelPayment(account.sub, id);
  }
}

@ApiTags("Subscrições")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller("subscriptions")
export class SubscriptionsController {
  constructor(private readonly monetization: AdminMonetizationService) {}

  @Get("mine")
  @ApiOperation({ summary: "Pedidos Pro da conta actual" })
  mine(@CurrentUser() account: AccessTokenClaims) {
    return this.monetization.listMineSubscriptions(account.sub);
  }
}
