import { DomainError } from "../../../shared/domain/domain-error";

export class InviteNotFoundError extends DomainError {
  readonly kind = "not_found" as const;
  readonly code = "beta.invite_not_found";
  constructor() {
    super("Convite não encontrado.");
  }
}

export class InviteAlreadyRevokedError extends DomainError {
  readonly kind = "invalid_state" as const;
  readonly code = "beta.invite_already_revoked";
  constructor() {
    super("O acesso já foi retirado.");
  }
}

export class InviteNotRevokedError extends DomainError {
  readonly kind = "invalid_state" as const;
  readonly code = "beta.invite_not_revoked";
  constructor() {
    super("Só convites retirados podem ser repostos.");
  }
}

export class BetaInviteRequiredError extends DomainError {
  readonly kind = "forbidden" as const;
  readonly code = "beta.invite_required";
  constructor() {
    super(
      "O PASSA está em beta fechado. Responda ao inquérito para entrar na lista de espera — enviaremos um convite para este email ou telemóvel.",
      "email",
    );
  }
}
