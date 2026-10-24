import type { UseCase } from "../../../../shared/application/use-case";
import type { Clock } from "../../../../shared/domain/clock";
import { InviteAlreadyRevokedError, InviteNotFoundError } from "../../domain/errors";
import { BetaInviteRepository } from "../../domain/repositories";
import { toInviteView } from "../invite-view";

export class RevokeInviteUseCase implements UseCase<string, ReturnType<typeof toInviteView>> {
  constructor(
    private readonly invites: BetaInviteRepository,
    private readonly clock: Clock,
  ) {}

  async execute(id: string) {
    const invite = await this.invites.findById(id);
    if (!invite) throw new InviteNotFoundError();
    if (invite.status === "revoked") throw new InviteAlreadyRevokedError();
    const revoked = { ...invite, status: "revoked" as const, revokedAt: this.clock.now() };
    await this.invites.save(revoked);
    return toInviteView(revoked);
  }
}
