import { Module } from "@nestjs/common";

import { ConfigModule } from "./config/config.module";
import { AdminModule } from "./modules/admin";
import { BetaModule } from "./modules/beta";
import { CatalogModule } from "./modules/catalog";
import { IdentityModule } from "./modules/identity";
import { MailModule } from "./modules/mail/mail.module";
import { ResearchModule } from "./modules/research";
import { CoreModule } from "./shared/infrastructure/core.module";
import { DatabaseModule } from "./shared/infrastructure/database/database.module";
import { StorageModule } from "./shared/infrastructure/storage/storage.module";
import { ApiStatusController, HealthController } from "./shared/presentation/http/health.controller";

@Module({
  imports: [ConfigModule, DatabaseModule, CoreModule, StorageModule, MailModule, BetaModule, IdentityModule, ResearchModule, CatalogModule, AdminModule],
  controllers: [HealthController, ApiStatusController],
})
export class AppModule {}
