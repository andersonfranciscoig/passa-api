import { InvalidDisplayNameError, InvalidEmailError, WeakPasswordError } from "./errors";

export type UserRole = "USER" | "ADMIN";
export type UserStatus = "ACTIVE" | "SUSPENDED";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export interface User {
  readonly id: string;
  readonly email: string;
  readonly passwordHash: string;
  readonly displayName: string;
  readonly phone?: string;
  readonly province?: string;
  readonly municipality?: string;
  readonly neighborhood?: string;
  readonly bio?: string;
  readonly avatarUrl?: string;
  readonly phoneVerifiedAt?: Date;
  /** Última atividade autenticada (atualizada no máximo a cada 2 minutos). */
  readonly lastSeenAt?: Date;
  readonly role: UserRole;
  readonly status: UserStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export function normalizeEmail(raw: string): string {
  const email = raw.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) throw new InvalidEmailError();
  return email;
}

export function validatePassword(password: string): string {
  if (password.length < 8) {
    throw new WeakPasswordError("A palavra-passe deve ter pelo menos 8 caracteres.");
  }
  if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
    throw new WeakPasswordError("A palavra-passe deve conter letras e números.");
  }
  return password;
}

export function validateDisplayName(raw: string): string {
  const name = raw.trim().replace(/\s+/g, " ");
  if (name.length < 2) throw new InvalidDisplayNameError("Indique o seu nome público.");
  if (name.length > 50) throw new InvalidDisplayNameError("O nome deve ter no máximo 50 caracteres.");
  return name;
}

export function isAdmin(user: User): boolean {
  return user.role === "ADMIN";
}
