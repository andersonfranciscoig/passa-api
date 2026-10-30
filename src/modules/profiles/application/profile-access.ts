import { AccountNotFoundError } from "../../identity/domain/errors";
import type { UserRepository } from "../../identity/domain/repositories";
import type { User } from "../../identity/domain/user";

/** Perfil público visível: existe e não está suspenso (senão, "Conta não encontrada."). */
export async function requireVisibleProfile(users: UserRepository, id: string): Promise<User> {
  const user = await users.findById(id);
  if (!user || user.status === "SUSPENDED") throw new AccountNotFoundError();
  return user;
}
