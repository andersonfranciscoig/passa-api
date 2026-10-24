import "dotenv/config";
import "reflect-metadata";

import { NestFactory } from "@nestjs/core";
import { z } from "zod";

import { AppModule } from "./app.module";
import { AppConfig } from "./config/app-config";
import { DomainErrorFilter } from "./shared/presentation/http/domain-error.filter";
import { setupSwagger } from "./shared/presentation/http/setup-swagger";

z.config(z.locales.pt());

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(AppConfig);

  app.setGlobalPrefix("api/v1");
  app.useGlobalFilters(new DomainErrorFilter());
  app.enableCors({ origin: config.corsOrigins, credentials: true });
  app.enableShutdownHooks();

  if (config.env !== "production") {
    setupSwagger(app);
  }

  await app.listen(config.port);
  console.log(`PASSA API em http://localhost:${config.port}/api/v1  (docs: /docs)`);
}

void bootstrap();
