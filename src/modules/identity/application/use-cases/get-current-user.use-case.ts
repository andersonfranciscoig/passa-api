import type { UseCase } from "../../../../shared/application/use-case";
import { AccountNotFoundError, AccountSuspendedError } from "../../domain/errors";
import type { UserRepository } from "../../domain/repositories";
import { toUserView, type UserView } from "../user-view";

export class GetCurrentUserUseCase implements UseCase<string, UserView> {
  constructor(private readonly users: UserRepository) {}

  async execute(userId: string): Promise<UserView> {
    const user = await this.users.findById(userId);
    if (!user) throw new AccountNotFoundError();
    if (user.status === "SUSPENDED") throw new AccountSuspendedError();
    return toUserView(user);
  }
}
