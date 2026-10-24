export interface AccessTokenClaims {
  sub: string;
  email: string;
  role: "USER" | "ADMIN";
}

export abstract class AccessTokenIssuer {
  abstract issue(claims: AccessTokenClaims): Promise<string>;
  abstract verify(token: string): Promise<AccessTokenClaims | null>;
}

export interface AuthTokens {
  accessToken: string;
  tokenType: "Bearer";
  expiresIn: number;
}
