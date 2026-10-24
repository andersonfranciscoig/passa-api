import type { JwtService } from "@nestjs/jwt";

import type { AccessTokenClaims, AccessTokenIssuer } from "../application/ports/access-token-issuer";

export class JwtAccessTokenIssuer implements AccessTokenIssuer {
  constructor(
    private readonly jwt: JwtService,
    private readonly ttlSeconds: number,
  ) {}

  issue(claims: AccessTokenClaims): Promise<string> {
    return this.jwt.signAsync(claims, { expiresIn: this.ttlSeconds });
  }

  async verify(token: string): Promise<AccessTokenClaims | null> {
    try {
      const payload = await this.jwt.verifyAsync<AccessTokenClaims>(token);
      if (!payload.sub || !payload.email || !payload.role) return null;
      return { sub: payload.sub, email: payload.email, role: payload.role };
    } catch {
      return null;
    }
  }
}
