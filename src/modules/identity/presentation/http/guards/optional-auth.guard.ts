import { type CanActivate, type ExecutionContext, Injectable } from "@nestjs/common";

import { LastSeenTracker } from "../../../application/last-seen-tracker";
import { AccessTokenIssuer } from "../../../application/ports/access-token-issuer";
import type { AuthenticatedRequest } from "./authenticated-request";

/** Lê o JWT se existir; não exige sessão (ex.: acesso ao beta). */
@Injectable()
export class OptionalAuthGuard implements CanActivate {
  constructor(
    private readonly tokens: AccessTokenIssuer,
    private readonly lastSeen: LastSeenTracker,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const [scheme, token] = request.headers.authorization?.split(" ") ?? [];
    if (scheme === "Bearer" && token) {
      request.account = (await this.tokens.verify(token)) ?? undefined;
      if (request.account) void this.lastSeen.touch(request.account.sub);
    }
    return true;
  }
}
