import type { UseCase } from "../../../../shared/application/use-case";
import type { Clock } from "../../../../shared/domain/clock";
import { AccountNotFoundError, VerificationCodeInvalidError } from "../../domain/errors";
import type { ContactVerificationRepository, UserRepository } from "../../domain/repositories";
import { OutboundNotifications } from "../../../mail/application/outbound-notifications";
import { toUserView, type UserView } from "../user-view";
import { VerifiedAccountNotifier } from "../verified-account-notifier";

export class ConfirmContactVerificationUseCase implements UseCase<{ userId: string; code: string }, UserView> {
  constructor(
    private readonly users: UserRepository,
    private readonly challenges: ContactVerificationRepository,
    private readonly clock: Clock,
    private readonly outbound?: OutboundNotifications,
    private readonly verified?: VerifiedAccountNotifier,
  ) {}

  async execute(input: { userId: string; code: string }) {
    const user = await this.users.findById(input.userId);
    if (!user) throw new AccountNotFoundError();
    const pending = await this.challenges.find(input.userId);
    const code = input.code.trim();
    if (!pending || !user.phone || pending.code !== code || pending.expiresAt < this.clock.now() || pending.phone !== user.phone) {
      throw new VerificationCodeInvalidError();
    }
    const next = { ...user, phoneVerifiedAt: this.clock.now(), updatedAt: this.clock.now() };
    await this.users.save(next);
    await this.challenges.delete(input.userId);
    await this.outbound?.contactConfirmed({ userName: next.displayName, userEmail: next.email });
    await this.verified?.ifBecameVerified(user, next);
    return toUserView(next);
  }
}
