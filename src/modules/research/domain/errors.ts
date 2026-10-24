import { DomainError } from "../../../shared/domain/domain-error";

export class DuplicateSurveyResponseError extends DomainError {
  readonly kind = "conflict" as const;
  readonly code = "research.duplicate_response";
  constructor() {
    super("Já recebemos uma resposta com este contacto. Obrigado!");
  }
}

export class ContactRequiredError extends DomainError {
  readonly kind = "validation" as const;
  readonly code = "research.contact_required";
  constructor() {
    super("Indique o seu email ou número de telemóvel.", "email");
  }
}
