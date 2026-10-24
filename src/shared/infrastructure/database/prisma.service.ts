import { Injectable, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    try {
      await this.$connect();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`PostgreSQL ainda não respondeu no arranque: ${message}`);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
