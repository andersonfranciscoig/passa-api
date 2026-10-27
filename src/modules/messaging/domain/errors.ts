import { DomainError } from "../../../shared/domain/domain-error";

export class ConversationListingNotFoundError extends DomainError {
  readonly kind = "not_found" as const;
  readonly code = "messaging.listing_not_found";
  constructor() {
    super("Anúncio não encontrado.");
  }
}

export class ConversationOwnListingError extends DomainError {
  readonly kind = "forbidden" as const;
  readonly code = "messaging.own_listing";
  constructor() {
    super("Não pode iniciar uma conversa no seu próprio anúncio.");
  }
}

export class ConversationNotFoundError extends DomainError {
  readonly kind = "not_found" as const;
  readonly code = "messaging.not_found";
  constructor() {
    super("Conversa não encontrada.");
  }
}

export class ConversationForbiddenError extends DomainError {
  readonly kind = "forbidden" as const;
  readonly code = "messaging.forbidden";
  constructor() {
    super("Não participa nesta conversa.");
  }
}

export class EmptyMessageError extends DomainError {
  readonly kind = "validation" as const;
  readonly code = "messaging.empty_message";
  constructor() {
    super("Escreva uma mensagem.", "body");
  }
}

export class MessageTooLongError extends DomainError {
  readonly kind = "validation" as const;
  readonly code = "messaging.message_too_long";
  constructor() {
    super("A mensagem é demasiado longa.", "body");
  }
}
