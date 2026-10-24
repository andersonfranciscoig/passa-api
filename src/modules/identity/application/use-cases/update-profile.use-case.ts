import type { UseCase } from "../../../../shared/application/use-case";
import { createAngolanPhone } from "../../../../shared/domain/phone";
import { AccountNotFoundError, InvalidDisplayNameError } from "../../domain/errors";
import type { UserRepository } from "../../domain/repositories";
import { validateDisplayName, type User } from "../../domain/user";
import { toUserView, type UserView } from "../user-view";
import { VerifiedAccountNotifier } from "../verified-account-notifier";

export interface UpdateProfileInput {
  userId: string;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  phone?: string;
  province?: string;
  municipality?: string;
  neighborhood?: string;
}

export class UpdateProfileUseCase implements UseCase<UpdateProfileInput, UserView> {
  constructor(
    private readonly users: UserRepository,
    private readonly verified?: VerifiedAccountNotifier,
  ) {}

  async execute(input: UpdateProfileInput): Promise<UserView> {
    const user = await this.users.findById(input.userId);
    if (!user) throw new AccountNotFoundError();

    let displayName = user.displayName;
    if (input.displayName != null) {
      try {
        displayName = validateDisplayName(input.displayName);
      } catch {
        throw new InvalidDisplayNameError("Indique o seu nome público.");
      }
    }

    const bio = input.bio !== undefined ? input.bio.trim().slice(0, 280) || undefined : user.bio;
    const avatarUrl = input.avatarUrl !== undefined ? input.avatarUrl.trim() || undefined : user.avatarUrl;
    const phone = input.phone !== undefined ? (input.phone.trim() ? createAngolanPhone(input.phone) : undefined) : user.phone;
    const phoneChanged = phone !== user.phone;

    const next: User = {
      ...user,
      displayName,
      bio,
      avatarUrl,
      phone,
      phoneVerifiedAt: phoneChanged ? undefined : user.phoneVerifiedAt,
      province: input.province !== undefined ? input.province.trim() || undefined : user.province,
      municipality: input.municipality !== undefined ? input.municipality.trim() || undefined : user.municipality,
      neighborhood: input.neighborhood !== undefined ? input.neighborhood.trim() || undefined : user.neighborhood,
      updatedAt: new Date(),
    };
    await this.users.save(next);
    await this.verified?.ifBecameVerified(user, next);
    return toUserView(next);
  }
}
