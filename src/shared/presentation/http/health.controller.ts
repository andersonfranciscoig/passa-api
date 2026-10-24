import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { PrismaService } from "../../infrastructure/database/prisma.service";

@ApiTags("Saúde")
@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: "A API e a base de dados respondem" })
  async check() {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: "ok" };
  }
}

@ApiTags("Saúde")
@Controller("status")
export class ApiStatusController {
  @Get()
  @ApiOperation({ summary: "Data atual e se a API está ativa" })
  status() {
    return { date: new Date().toISOString(), active: true };
  }
}
