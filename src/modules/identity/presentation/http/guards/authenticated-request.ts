import type { Request } from "express";

import type { AccessTokenClaims } from "../../../application/ports/access-token-issuer";

export interface AuthenticatedRequest extends Request {
  account?: AccessTokenClaims;
}
