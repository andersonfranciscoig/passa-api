import type { CurrentAccess, CurrentAccessUser } from "../../../../shared/application/beta-access-policy";
import type { UseCase } from "../../../../shared/application/use-case";
import { hasBetaAccess } from "../../domain/beta";
import { BetaInviteRepository, BetaSettingsRepository } from "../../domain/repositories";

export class GetAccessUseCase implements UseCase<CurrentAccessUser | null, CurrentAccess> {
  constructor(
    private readonly settings: BetaSettingsRepository,
    private readonly invites: BetaInviteRepository,
  ) {}

  async execute(user: CurrentAccessUser | null): Promise<CurrentAccess> {
    const current = await this.settings.get();
    if (!current.closedBeta) return { closedBeta: false, allowed: true, signedIn: !!user };
    if (!user) return { closedBeta: true, allowed: false, signedIn: false };
    return {
      closedBeta: true,
      allowed: hasBetaAccess(current, user, await this.invites.list()),
      signedIn: true,
    };
  }
}
