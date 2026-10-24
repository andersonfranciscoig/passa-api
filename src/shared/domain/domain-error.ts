export type DomainErrorKind =
  | "validation"
  | "conflict"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "invalid_state";

/**
 * Erro esperado de uma regra de negócio. A apresentação traduz `kind` para HTTP.
 * `field` associa a falha a um campo de formulário.
 */
export abstract class DomainError extends Error {
  abstract readonly kind: DomainErrorKind;
  abstract readonly code: string;
  readonly field?: string;

  constructor(message: string, field?: string) {
    super(message);
    this.name = new.target.name;
    this.field = field;
  }
}

export class ValidationError extends DomainError {
  readonly kind = "validation" as const;
  readonly code = "validation";
}
