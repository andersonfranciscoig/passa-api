import type { UseCase } from "../../../../shared/application/use-case";
import { InviteNotFoundError, InviteNotRevokedError } from "../../domain/errors";
import { BetaInviteRepository, InviteNotifier } from "../../domain/repositories";
import { toInviteView } from "../invite-view";

export class RestoreInviteUseCase implements UseCase<string, ReturnType<typeof toInviteView>> {
  constructor(
    private readonly invites: BetaInviteRepository,
    private readonly notifier?: InviteNotifier,
  ) {}

  async execute(id: string) {
    const invite = await this.invites.findById(id);
    if (!invite) throw new InviteNotFoundError();
    if (invite.status !== "revoked") throw new InviteNotRevokedError();
    const restored = {
      ...invite,
      status: (invite.acceptedUserId ? "accepted" : "invited") as "accepted" | "invited",
      revokedAt: undefined,
    };
    await this.invites.save(restored);
    if (restored.status === "invited") {
      await this.notifier?.send(restored);
    }
    return toInviteView(restored);
  }
}
