import {
  BetaAccessPolicy,
  type CurrentAccess,
  type CurrentAccessUser,
} from "../../../shared/application/beta-access-policy";
import { findValidInvite } from "../domain/beta";
import { BetaInviteRequiredError } from "../domain/errors";
import { BetaInviteRepository, BetaSettingsRepository } from "../domain/repositories";
import { GetAccessUseCase } from "./use-cases/get-access.use-case";

export class BetaAccessPolicyService extends BetaAccessPolicy {
  constructor(
    private readonly settings: BetaSettingsRepository,
    private readonly invites: BetaInviteRepository,
    private readonly access: GetAccessUseCase,
    private readonly now: () => Date,
  ) {
    super();
  }

  async assertCanRegister(who: { email?: string; phone?: string }): Promise<void> {
    const current = await this.settings.get();
    if (!current.closedBeta) return;
    if (findValidInvite(await this.invites.list(), who)) return;
    throw new BetaInviteRequiredError();
  }

  async markRegistered(userId: string, who: { email?: string; phone?: string }): Promise<void> {
    const invite = findValidInvite(await this.invites.list(), who);
    if (invite && invite.status === "invited") {
      await this.invites.save({
        ...invite,
        status: "accepted",
        acceptedUserId: userId,
        acceptedAt: this.now(),
      });
    }
  }

  currentAccess(user: CurrentAccessUser | null): Promise<CurrentAccess> {
    return this.access.execute(user);
  }
}
