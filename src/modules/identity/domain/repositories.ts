import type { User } from "./user";

export abstract class UserRepository {
  abstract findById(id: string): Promise<User | null>;
  abstract findByEmail(email: string): Promise<User | null>;
  abstract findByPhone(phone: string): Promise<User | null>;
  abstract save(user: User): Promise<void>;
}

export interface ContactVerification {
  readonly userId: string;
  readonly phone: string;
  readonly code: string;
  readonly expiresAt: Date;
  readonly createdAt: Date;
}

export abstract class ContactVerificationRepository {
  abstract save(row: ContactVerification): Promise<void>;
  abstract find(userId: string): Promise<ContactVerification | null>;
  abstract delete(userId: string): Promise<void>;
}

export abstract class PasswordHasher {
  abstract hash(password: string): Promise<string>;
  abstract matches(password: string, hash: string): Promise<boolean>;
}
