import type { BetaAccessPolicy } from "../../../../shared/application/beta-access-policy";
import type { UseCase } from "../../../../shared/application/use-case";
import type { Clock } from "../../../../shared/domain/clock";
import type { IdGenerator } from "../../../../shared/domain/id-generator";
import { createAngolanPhone } from "../../../../shared/domain/phone";
import { AccountAlreadyExistsError, TermsNotAcceptedError } from "../../domain/errors";
import type { PasswordHasher, UserRepository } from "../../domain/repositories";
import { normalizeEmail, validateDisplayName, validatePassword, type User } from "../../domain/user";
import type { AccessTokenIssuer, AuthTokens } from "../ports/access-token-issuer";
import { toUserView, type UserView } from "../user-view";

export interface RegisterInput {
  email: string;
  password: string;
  displayName: string;
  acceptTerms: boolean;
  phone?: string;
  province?: string;
  municipality?: string;
  neighborhood?: string;
}

export interface RegisterOutput {
  user: UserView;
  tokens: AuthTokens;
}

export class RegisterUseCase implements UseCase<RegisterInput, RegisterOutput> {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokens: AccessTokenIssuer,
    private readonly beta: BetaAccessPolicy,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
    private readonly accessTtlSeconds: number,
  ) {}

  async execute(input: RegisterInput): Promise<RegisterOutput> {
    if (!input.acceptTerms) throw new TermsNotAcceptedError();
    const email = normalizeEmail(input.email);
    const password = validatePassword(input.password);
    const displayName = validateDisplayName(input.displayName);
    const phone = input.phone?.trim() ? createAngolanPhone(input.phone) : undefined;

    if (await this.users.findByEmail(email)) throw new AccountAlreadyExistsError();
    if (phone && (await this.users.findByPhone(phone))) throw new AccountAlreadyExistsError();

    await this.beta.assertCanRegister({ email, phone });

    const now = this.clock.now();
    const user: User = {
      id: this.ids.next(),
      email,
      passwordHash: await this.hasher.hash(password),
      displayName,
      phone,
      province: input.province?.trim() || undefined,
      municipality: input.municipality?.trim() || undefined,
      neighborhood: input.neighborhood?.trim() || undefined,
      role: "USER",
      status: "ACTIVE",
      createdAt: now,
      updatedAt: now,
    };
    await this.users.save(user);
    await this.beta.markRegistered(user.id, { email, phone });

    const accessToken = await this.tokens.issue({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
    return {
      user: toUserView(user),
      tokens: { accessToken, tokenType: "Bearer", expiresIn: this.accessTtlSeconds },
    };
  }
}
