import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { ApiZodBody } from "../../../../shared/presentation/http/api-zod";
import { ZodValidationPipe } from "../../../../shared/presentation/http/zod-validation.pipe";
import type { AccessTokenClaims } from "../../../identity/application/ports/access-token-issuer";
import { CurrentUser } from "../../../identity/presentation/http/decorators/current-user.decorator";
import { AdminGuard } from "../../../identity/presentation/http/guards/admin.guard";
import { AuthGuard } from "../../../identity/presentation/http/guards/auth.guard";
import { GetSettingsUseCase } from "../../application/use-cases/get-settings.use-case";
import { InviteUseCase } from "../../application/use-cases/invite.use-case";
import { ListInvitesUseCase } from "../../application/use-cases/list-invites.use-case";
import { RestoreInviteUseCase } from "../../application/use-cases/restore-invite.use-case";
import { RevokeInviteUseCase } from "../../application/use-cases/revoke-invite.use-case";
import { SetClosedBetaUseCase } from "../../application/use-cases/set-closed-beta.use-case";
import { inviteSchema, setClosedBetaSchema, type InviteBody, type SetClosedBetaBody } from "./beta.schemas";

@ApiTags("Admin — Beta")
@ApiBearerAuth()
@UseGuards(AuthGuard, AdminGuard)
@Controller("admin/beta")
export class AdminBetaController {
  constructor(
    private readonly list: ListInvitesUseCase,
    private readonly invite: InviteUseCase,
    private readonly revoke: RevokeInviteUseCase,
    private readonly restore: RestoreInviteUseCase,
    private readonly settings: GetSettingsUseCase,
    private readonly setClosed: SetClosedBetaUseCase,
  ) {}

  @Get("invites")
  @ApiOperation({ summary: "Listar convites do beta" })
  invites() {
    return this.list.execute();
  }

  @Post("invites")
  @ApiOperation({ summary: "Convidar pessoas (da lista de espera ou manualmente)" })
  @ApiZodBody(inviteSchema)
  createInvites(
    @CurrentUser() account: AccessTokenClaims,
    @Body(new ZodValidationPipe(inviteSchema)) body: InviteBody,
  ) {
    return this.invite.execute({ actorId: account.sub, people: body.people });
  }

  @Post("invites/:id/revoke")
  @ApiOperation({ summary: "Retirar acesso" })
  revokeInvite(@Param("id") id: string) {
    return this.revoke.execute(id);
  }

  @Post("invites/:id/restore")
  @ApiOperation({ summary: "Repor um convite retirado" })
  restoreInvite(@Param("id") id: string) {
    return this.restore.execute(id);
  }

  @Get("settings")
  @ApiOperation({ summary: "Estado do beta fechado" })
  currentSettings() {
    return this.settings.execute();
  }

  @Patch("settings")
  @ApiOperation({ summary: "Terminar o beta ou voltar a fechá-lo" })
  @ApiZodBody(setClosedBetaSchema)
  updateSettings(
    @CurrentUser() account: AccessTokenClaims,
    @Body(new ZodValidationPipe(setClosedBetaSchema)) body: SetClosedBetaBody,
  ) {
    return this.setClosed.execute({ actorId: account.sub, closed: body.closed });
  }
}
