import type { UseCase } from "../../../../shared/application/use-case";
import { BetaInviteRepository } from "../../domain/repositories";
import { toInviteView } from "../invite-view";

export class ListInvitesUseCase implements UseCase<void, ReturnType<typeof toInviteView>[]> {
  constructor(private readonly invites: BetaInviteRepository) {}

  async execute() {
    return (await this.invites.list())
      .sort((a, b) => b.invitedAt.getTime() - a.invitedAt.getTime())
      .map(toInviteView);
  }
}
