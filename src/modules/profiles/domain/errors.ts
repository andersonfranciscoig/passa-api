import { DomainError } from "../../../shared/domain/domain-error";

export class CannotReviewOwnProfileError extends DomainError {
  readonly kind = "bad_request" as const;
  readonly code = "profiles.own_review";
  constructor() {
    super("Não pode avaliar o seu próprio perfil.");
  }
}

export class ProfileAlreadyReviewedError extends DomainError {
  readonly kind = "conflict" as const;
  readonly code = "profiles.already_reviewed";
  constructor() {
    super("Já avaliou este perfil.");
  }
}

export class InvalidRatingError extends DomainError {
  readonly kind = "bad_request" as const;
  readonly code = "profiles.invalid_rating";
  constructor() {
    super("A avaliação deve ser um número inteiro de 1 a 5.", "rating");
  }
}

export class InvalidReviewCommentError extends DomainError {
  readonly kind = "bad_request" as const;
  readonly code = "profiles.invalid_comment";
  constructor() {
    super("O comentário deve ter no máximo 500 caracteres.", "comment");
  }
}

export class CannotLikeOwnProfileError extends DomainError {
  readonly kind = "bad_request" as const;
  readonly code = "profiles.own_like";
  constructor() {
    super("Não pode gostar do seu próprio perfil.");
  }
}
