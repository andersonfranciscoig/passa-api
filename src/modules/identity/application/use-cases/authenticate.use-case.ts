import type { UseCase } from "../../../../shared/application/use-case";
import { AccountSuspendedError, InvalidCredentialsError } from "../../domain/errors";
import type { PasswordHasher, UserRepository } from "../../domain/repositories";
import { normalizeEmail } from "../../domain/user";
import type { AccessTokenIssuer, AuthTokens } from "../ports/access-token-issuer";
import type { LastSeenTracker } from "../last-seen-tracker";
import { toUserView, type UserView } from "../user-view";

export interface AuthenticateInput {
  email: string;
  password: string;
}

export interface AuthenticateOutput {
  user: UserView;
  tokens: AuthTokens;
}

export class AuthenticateUseCase implements UseCase<AuthenticateInput, AuthenticateOutput> {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokens: AccessTokenIssuer,
    private readonly accessTtlSeconds: number,
    private readonly lastSeen?: LastSeenTracker,
  ) {}

  async execute({ email, password }: AuthenticateInput): Promise<AuthenticateOutput> {
    let normalized: string;
    try {
      normalized = normalizeEmail(email);
    } catch {
      throw new InvalidCredentialsError();
    }

    const user = await this.users.findByEmail(normalized);
    const valid = await this.hasher.matches(password, user?.passwordHash ?? "");
    if (!user || !valid) throw new InvalidCredentialsError();
    if (user.status === "SUSPENDED") throw new AccountSuspendedError();

    const accessToken = await this.tokens.issue({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
    void this.lastSeen?.touch(user.id, { force: true });
    return {
      user: toUserView(user),
      tokens: { accessToken, tokenType: "Bearer", expiresIn: this.accessTtlSeconds },
    };
  }
}
