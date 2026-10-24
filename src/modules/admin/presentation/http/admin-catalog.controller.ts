import { Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { AdminGuard } from "../../../identity/presentation/http/guards/admin.guard";
import { AuthGuard } from "../../../identity/presentation/http/guards/auth.guard";
import { AdminCatalogService } from "../../application/admin-catalog.service";

@ApiTags("Admin — Anúncios")
@ApiBearerAuth()
@UseGuards(AuthGuard, AdminGuard)
@Controller("admin/listings")
export class AdminCatalogController {
  constructor(private readonly catalog: AdminCatalogService) {}

  @Get()
  @ApiOperation({ summary: "Listar todos os anúncios" })
  list() {
    return this.catalog.listAll();
  }

  @Post(":id/remove")
  @ApiOperation({ summary: "Remover anúncio pela moderação" })
  remove(@Param("id") id: string) {
    return this.catalog.remove(id);
  }
}
