import { DomainError } from "../../../shared/domain/domain-error";

export class NotFoundError extends DomainError {
  readonly kind = "not_found" as const;
  readonly code = "not_found";
}

export class InvalidStateError extends DomainError {
  readonly kind = "invalid_state" as const;
  readonly code = "invalid_state";
}

export class ConflictError extends DomainError {
  readonly kind = "conflict" as const;
  readonly code = "conflict";
}

export class ForbiddenError extends DomainError {
  readonly kind = "forbidden" as const;
  readonly code = "forbidden";
}

export class AdminValidationError extends DomainError {
  readonly kind = "validation" as const;
  readonly code = "validation";
}
