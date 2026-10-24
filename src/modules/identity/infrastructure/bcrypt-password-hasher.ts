import { compare, hash } from "bcryptjs";

import type { PasswordHasher } from "../domain/repositories";

export class BcryptPasswordHasher implements PasswordHasher {
  constructor(private readonly rounds = 10) {}

  hash(password: string): Promise<string> {
    return hash(password, this.rounds);
  }

  matches(password: string, passwordHash: string): Promise<boolean> {
    if (!passwordHash) return Promise.resolve(false);
    return compare(password, passwordHash);
  }
}
