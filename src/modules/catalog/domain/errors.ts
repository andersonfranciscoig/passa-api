import { DomainError } from "../../../shared/domain/domain-error";

export class ListingNotFoundError extends DomainError {
  readonly kind = "not_found" as const;
  readonly code = "catalog.not_found";
  constructor() {
    super("Anúncio não encontrado.");
  }
}

export class ListingForbiddenError extends DomainError {
  readonly kind = "forbidden" as const;
  readonly code = "catalog.forbidden";
  constructor(message = "Este anúncio não lhe pertence.") {
    super(message);
  }
}

export class ListingStateError extends DomainError {
  readonly kind = "invalid_state" as const;
  readonly code = "catalog.invalid_state";
  constructor(message: string) {
    super(message);
  }
}
