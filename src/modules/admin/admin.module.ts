import { Module } from "@nestjs/common";

import { AdminCatalogService } from "./application/admin-catalog.service";
import { AdminIdentityService } from "./application/admin-identity.service";
import { AdminInsightsService } from "./application/admin-insights.service";
import { AdminModerationService } from "./application/admin-moderation.service";
import { AdminMonetizationService } from "./application/admin-monetization.service";
import { AdminCatalogController } from "./presentation/http/admin-catalog.controller";
import { AdminIdentityController } from "./presentation/http/admin-identity.controller";
import { AdminInsightsController } from "./presentation/http/admin-insights.controller";
import { AdminModerationController } from "./presentation/http/admin-moderation.controller";
import { AdminMonetizationController } from "./presentation/http/admin-monetization.controller";
import { AdminUsersController } from "./presentation/http/admin-users.controller";
import { PlansController, PromotionsController, SubscriptionsController } from "./presentation/http/public-monetization.controller";

@Module({
  controllers: [
    AdminInsightsController,
    AdminCatalogController,
    AdminModerationController,
    AdminIdentityController,
    AdminMonetizationController,
    AdminUsersController,
    PlansController,
    PromotionsController,
    SubscriptionsController,
  ],
  providers: [AdminInsightsService, AdminCatalogService, AdminModerationService, AdminIdentityService, AdminMonetizationService],
})
export class AdminModule {}
