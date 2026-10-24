import { DomainError } from "../../../shared/domain/domain-error";

export class InvalidEmailError extends DomainError {
  readonly kind = "validation" as const;
  readonly code = "identity.invalid_email";
  constructor() {
    super("Indique um email válido.", "email");
  }
}

export class WeakPasswordError extends DomainError {
  readonly kind = "validation" as const;
  readonly code = "identity.weak_password";
  constructor(message: string) {
    super(message, "password");
  }
}

export class InvalidDisplayNameError extends DomainError {
  readonly kind = "validation" as const;
  readonly code = "identity.invalid_display_name";
  constructor(message: string) {
    super(message, "displayName");
  }
}

export class TermsNotAcceptedError extends DomainError {
  readonly kind = "validation" as const;
  readonly code = "identity.terms_not_accepted";
  constructor() {
    super("Tem de aceitar as regras de utilização.", "acceptTerms");
  }
}

export class AccountAlreadyExistsError extends DomainError {
  readonly kind = "conflict" as const;
  readonly code = "identity.account_already_exists";
  constructor() {
    super("Já existe uma conta com este email.", "email");
  }
}

export class InvalidCredentialsError extends DomainError {
  readonly kind = "unauthorized" as const;
  readonly code = "identity.invalid_credentials";
  constructor() {
    super("Email ou palavra-passe incorretos.");
  }
}

export class InvalidSessionError extends DomainError {
  readonly kind = "unauthorized" as const;
  readonly code = "identity.invalid_session";
  constructor() {
    super("A sessão expirou ou já não é válida. Entre de novo.");
  }
}

export class AccountNotFoundError extends DomainError {
  readonly kind = "not_found" as const;
  readonly code = "identity.account_not_found";
  constructor() {
    super("Conta não encontrada.");
  }
}

export class AccountSuspendedError extends DomainError {
  readonly kind = "forbidden" as const;
  readonly code = "identity.account_suspended";
  constructor() {
    super("Esta conta está suspensa.");
  }
}

export class PhoneRequiredForVerificationError extends DomainError {
  readonly kind = "validation" as const;
  readonly code = "identity.phone_required_for_verification";
  constructor() {
    super("Adicione primeiro um número de telemóvel ao perfil.", "phone");
  }
}

export class ContactAlreadyVerifiedError extends DomainError {
  readonly kind = "invalid_state" as const;
  readonly code = "identity.contact_already_verified";
  constructor() {
    super("Este número já está confirmado.");
  }
}

export class VerificationRateLimitedError extends DomainError {
  readonly kind = "invalid_state" as const;
  readonly code = "identity.verification_rate_limited";
  constructor() {
    super("Aguarde um minuto antes de pedir um novo código.");
  }
}

export class VerificationCodeInvalidError extends DomainError {
  readonly kind = "validation" as const;
  readonly code = "identity.verification_code_invalid";
  constructor() {
    super("Código inválido ou expirado.", "code");
  }
}

export class MailDeliveryError extends DomainError {
  readonly kind = "invalid_state" as const;
  readonly code = "identity.mail_delivery_failed";
  constructor() {
    super("Não foi possível enviar o email com o código. Tente novamente dentro de instantes.");
  }
}

export class NotAdministratorError extends DomainError {
  readonly kind = "forbidden" as const;
  readonly code = "identity.not_administrator";
  constructor() {
    super("Área reservada à equipa.");
  }
}
