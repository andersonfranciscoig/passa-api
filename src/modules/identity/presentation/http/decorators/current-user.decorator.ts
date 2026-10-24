import { createParamDecorator, type ExecutionContext } from "@nestjs/common";

import type { AccessTokenClaims } from "../../../application/ports/access-token-issuer";
import type { AuthenticatedRequest } from "../guards/authenticated-request";

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AccessTokenClaims | undefined => {
    return context.switchToHttp().getRequest<AuthenticatedRequest>().account;
  },
);
