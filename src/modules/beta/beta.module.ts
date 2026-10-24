import { forwardRef, Global, Module } from "@nestjs/common";

import { IdentityModule } from "../identity/identity.module";

import { BetaAccessPolicy } from "../../shared/application/beta-access-policy";
import { Clock } from "../../shared/domain/clock";
import { IdGenerator } from "../../shared/domain/id-generator";
import { provideUseCase } from "../../shared/infrastructure/provide";
import { BetaAccessPolicyService } from "./application/beta-access-policy.service";
import { GetAccessUseCase } from "./application/use-cases/get-access.use-case";
import { GetSettingsUseCase } from "./application/use-cases/get-settings.use-case";
import { InviteUseCase } from "./application/use-cases/invite.use-case";
import { ListInvitesUseCase } from "./application/use-cases/list-invites.use-case";
import { RestoreInviteUseCase } from "./application/use-cases/restore-invite.use-case";
import { RevokeInviteUseCase } from "./application/use-cases/revoke-invite.use-case";
import { SetClosedBetaUseCase } from "./application/use-cases/set-closed-beta.use-case";
import { OutboundNotifications } from "../mail/application/outbound-notifications";
import { BetaInviteRepository, BetaSettingsRepository, InviteNotifier } from "./domain/repositories";
import { EmailInviteNotifier } from "./infrastructure/email-invite-notifier";
import {
  PrismaBetaInviteRepository,
  PrismaBetaSettingsRepository,
} from "./infrastructure/prisma-beta-repositories";
import { AdminBetaController } from "./presentation/http/admin-beta.controller";
import { BetaController } from "./presentation/http/beta.controller";

@Global()
@Module({
  imports: [forwardRef(() => IdentityModule)],
  controllers: [BetaController, AdminBetaController],
  providers: [
    { provide: BetaInviteRepository, useClass: PrismaBetaInviteRepository },
    { provide: BetaSettingsRepository, useClass: PrismaBetaSettingsRepository },
    { provide: InviteNotifier, useClass: EmailInviteNotifier },
    provideUseCase(GetAccessUseCase, [BetaSettingsRepository, BetaInviteRepository]),
    provideUseCase(GetSettingsUseCase, [BetaSettingsRepository]),
    provideUseCase(ListInvitesUseCase, [BetaInviteRepository]),
    provideUseCase(InviteUseCase, [BetaInviteRepository, InviteNotifier, Clock, IdGenerator]),
    provideUseCase(RevokeInviteUseCase, [BetaInviteRepository, Clock]),
    provideUseCase(RestoreInviteUseCase, [BetaInviteRepository, InviteNotifier]),
    provideUseCase(SetClosedBetaUseCase, [BetaSettingsRepository, Clock, OutboundNotifications]),
    {
      provide: BetaAccessPolicy,
      inject: [BetaSettingsRepository, BetaInviteRepository, GetAccessUseCase, Clock],
      useFactory: (
        settings: BetaSettingsRepository,
        invites: BetaInviteRepository,
        access: GetAccessUseCase,
        clock: Clock,
      ) => new BetaAccessPolicyService(settings, invites, access, () => clock.now()),
    },
  ],
  exports: [BetaAccessPolicy, GetAccessUseCase],
})
export class BetaModule {}
