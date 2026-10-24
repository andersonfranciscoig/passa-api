import type { UseCase } from "../../../../shared/application/use-case";
import type { Clock } from "../../../../shared/domain/clock";
import { MailService } from "../../../mail/application/mail.service";
import {
  AccountNotFoundError,
  ContactAlreadyVerifiedError,
  MailDeliveryError,
  PhoneRequiredForVerificationError,
  VerificationRateLimitedError,
} from "../../domain/errors";
import type { ContactVerificationRepository, UserRepository } from "../../domain/repositories";

const CODE_TTL_MS = 10 * 60 * 1000;
const COOLDOWN_MS = 60 * 1000;

export class RequestContactVerificationUseCase
  implements UseCase<string, { phone: string; email: string }>
{
  constructor(
    private readonly users: UserRepository,
    private readonly challenges: ContactVerificationRepository,
    private readonly mail: MailService,
    private readonly clock: Clock,
  ) {}

  async execute(userId: string) {
    const user = await this.users.findById(userId);
    if (!user) throw new AccountNotFoundError();
    if (!user.phone) throw new PhoneRequiredForVerificationError();
    if (user.phoneVerifiedAt) throw new ContactAlreadyVerifiedError();

    const existing = await this.challenges.find(userId);
    const now = this.clock.now();
    if (existing && now.getTime() - existing.createdAt.getTime() < COOLDOWN_MS) {
      throw new VerificationRateLimitedError();
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    await this.challenges.save({
      userId,
      phone: user.phone,
      code,
      expiresAt: new Date(now.getTime() + CODE_TTL_MS),
      createdAt: now,
    });
    try {
      await this.mail.sendContactVerification({
        email: user.email,
        displayName: user.displayName,
        phone: user.phone,
        code,
      });
    } catch {
      await this.challenges.delete(userId);
      throw new MailDeliveryError();
    }
    return { phone: user.phone, email: user.email };
  }
}
