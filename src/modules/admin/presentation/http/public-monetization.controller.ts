import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import type { AccessTokenClaims } from "../../../identity/application/ports/access-token-issuer";
import { CurrentUser } from "../../../identity/presentation/http/decorators/current-user.decorator";
import { AuthGuard } from "../../../identity/presentation/http/guards/auth.guard";
import { AdminMonetizationService } from "../../application/admin-monetization.service";

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

@ApiTags("Destaques")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller("promotions")
export class PromotionsController {
  constructor(private readonly monetization: AdminMonetizationService) {}

  @Get("mine")
  @ApiOperation({ summary: "Pedidos de destaque da conta actual" })
  mine(@CurrentUser() account: AccessTokenClaims) {
    return this.monetization.listMinePromotions(account.sub);
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
