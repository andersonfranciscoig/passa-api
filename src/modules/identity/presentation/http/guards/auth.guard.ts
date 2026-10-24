import { type CanActivate, type ExecutionContext, Injectable } from "@nestjs/common";

import { AccessTokenIssuer } from "../../../application/ports/access-token-issuer";
import { InvalidSessionError } from "../../../domain/errors";
import type { AuthenticatedRequest } from "./authenticated-request";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly tokens: AccessTokenIssuer) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const [scheme, token] = request.headers.authorization?.split(" ") ?? [];
    const claims = scheme === "Bearer" && token ? await this.tokens.verify(token) : null;
    if (!claims) throw new InvalidSessionError();
    request.account = claims;
    return true;
  }
}
