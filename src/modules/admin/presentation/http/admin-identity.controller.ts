import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { AdminGuard } from "../../../identity/presentation/http/guards/admin.guard";
import { AuthGuard } from "../../../identity/presentation/http/guards/auth.guard";
import { AdminIdentityService } from "../../application/admin-identity.service";

@ApiTags("Admin — Utilizadores")
@ApiBearerAuth()
@UseGuards(AuthGuard, AdminGuard)
@Controller("admin/profiles")
export class AdminIdentityController {
  constructor(private readonly identity: AdminIdentityService) {}

  @Get()
  @ApiOperation({ summary: "Listar perfis (todos ou por ids)" })
  list(@Query("ids") ids?: string) {
    if (ids?.trim()) return this.identity.getProfiles(ids.split(",").map((id) => id.trim()).filter(Boolean));
    return this.identity.listProfiles();
  }
}
