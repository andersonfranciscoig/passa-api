import { Module } from "@nestjs/common";

import { Clock } from "../../shared/domain/clock";
import { provideUseCase } from "../../shared/infrastructure/provide";
import { UserRepository } from "../identity/domain/repositories";
import { GetListingInsightsUseCase } from "./application/use-cases/get-listing-insights.use-case";
import { GetSellerInsightsUseCase } from "./application/use-cases/get-seller-insights.use-case";
import { TrackListingEventUseCase } from "./application/use-cases/track-listing-event.use-case";
import { InsightsCatalog } from "./domain/repositories";
import { StatsRepository } from "./domain/stats";
import { PrismaAnalyticsRepository } from "./infrastructure/prisma-analytics.repository";
import { InsightsController } from "./presentation/http/insights.controller";
import { ListingAnalyticsController } from "./presentation/http/listing-analytics.controller";

@Module({
  controllers: [InsightsController, ListingAnalyticsController],
  providers: [
    PrismaAnalyticsRepository,
    { provide: StatsRepository, useExisting: PrismaAnalyticsRepository },
    { provide: InsightsCatalog, useExisting: PrismaAnalyticsRepository },
    provideUseCase(TrackListingEventUseCase, [StatsRepository, InsightsCatalog, UserRepository, Clock]),
    provideUseCase(GetSellerInsightsUseCase, [StatsRepository, InsightsCatalog, UserRepository, Clock]),
    provideUseCase(GetListingInsightsUseCase, [StatsRepository, InsightsCatalog, UserRepository, Clock]),
  ],
  exports: [TrackListingEventUseCase],
})
export class AnalyticsModule {}
