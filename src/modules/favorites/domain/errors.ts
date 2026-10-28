import { DomainError } from "../../../shared/domain/domain-error";

export class FavoriteListingNotFoundError extends DomainError {
  readonly kind = "not_found" as const;
  readonly code = "favorites.not_found";
  constructor() {
    super("Anúncio não encontrado.");
  }
}

export class FavoriteOwnListingError extends DomainError {
  readonly kind = "invalid_state" as const;
  readonly code = "favorites.own_listing";
  constructor() {
    super("Não pode guardar o seu próprio anúncio nos favoritos.");
  }
}
