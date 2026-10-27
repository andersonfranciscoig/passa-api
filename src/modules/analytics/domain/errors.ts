import { DomainError } from "../../../shared/domain/domain-error";

export class InsightsUnauthorizedError extends DomainError {
  readonly kind = "unauthorized" as const;
  readonly code = "analytics.unauthorized";
  constructor() {
    super("Inicie sessão para ver as estatísticas.");
  }
}

export class InsightsForbiddenError extends DomainError {
  readonly kind = "forbidden" as const;
  readonly code = "analytics.forbidden";
  constructor(message = "Só o anunciante pode ver estas estatísticas.") {
    super(message);
  }
}

export class InsightsNotFoundError extends DomainError {
  readonly kind = "not_found" as const;
  readonly code = "analytics.not_found";
  constructor() {
    super("Anúncio não encontrado.");
  }
}
