import { Body, Controller, Get, Param, Patch, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { ApiZodBody } from "../../../../shared/presentation/http/api-zod";
import { ZodValidationPipe } from "../../../../shared/presentation/http/zod-validation.pipe";
import type { AccessTokenClaims } from "../../../identity/application/ports/access-token-issuer";
import { CurrentUser } from "../../../identity/presentation/http/decorators/current-user.decorator";
import { AdminGuard } from "../../../identity/presentation/http/guards/admin.guard";
import { AuthGuard } from "../../../identity/presentation/http/guards/auth.guard";
import { AdminIdentityService } from "../../application/admin-identity.service";
import { userStatusSchema, type UserStatusBody } from "./admin.schemas";

@ApiTags("Admin — Utilizadores")
@ApiBearerAuth()
@UseGuards(AuthGuard, AdminGuard)
@Controller("admin/users")
export class AdminUsersController {
  constructor(private readonly identity: AdminIdentityService) {}

  @Get()
  @ApiOperation({ summary: "Listar contas e estados" })
  list() {
    return this.identity.listUsers();
  }

  @Get(":id")
  @ApiOperation({ summary: "Detalhe de uma conta, com anúncios" })
  get(@Param("id") id: string) {
    return this.identity.getUser(id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Ativar ou suspender uma conta" })
  @ApiZodBody(userStatusSchema)
  setStatus(
    @CurrentUser() account: AccessTokenClaims,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(userStatusSchema)) body: UserStatusBody,
  ) {
    return this.identity.setStatus(id, body.status, account.sub);
  }
}
