/** Gerador de identificadores. O domínio não depende de `crypto` diretamente. */
export abstract class IdGenerator {
  abstract next(): string;
}

export class UuidGenerator extends IdGenerator {
  next(): string {
    return crypto.randomUUID();
  }
}
