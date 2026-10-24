import { Module } from "@nestjs/common";

import { ListingsService } from "./application/listings.service";
import { ListingsController } from "./presentation/http/listings.controller";

@Module({
  controllers: [ListingsController],
  providers: [ListingsService],
  exports: [ListingsService],
})
export class CatalogModule {}
