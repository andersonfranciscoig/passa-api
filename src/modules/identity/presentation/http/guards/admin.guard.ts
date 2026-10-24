import { type CanActivate, type ExecutionContext, Injectable } from "@nestjs/common";

import { NotAdministratorError } from "../../../domain/errors";
import type { AuthenticatedRequest } from "./authenticated-request";

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (request.account?.role !== "ADMIN") throw new NotAdministratorError();
    return true;
  }
}
