import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { AdminGuard } from "../../../identity/presentation/http/guards/admin.guard";
import { AuthGuard } from "../../../identity/presentation/http/guards/auth.guard";
import { AdminInsightsService } from "../../application/admin-insights.service";

@ApiTags("Admin — Visão geral")
@ApiBearerAuth()
@UseGuards(AuthGuard, AdminGuard)
@Controller("admin/insights")
export class AdminInsightsController {
  constructor(private readonly insights: AdminInsightsService) {}

  @Get("pilot")
  @ApiOperation({ summary: "Indicadores do piloto" })
  pilot() {
    return this.insights.pilot();
  }
}
