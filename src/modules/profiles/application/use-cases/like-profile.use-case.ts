import type { UseCase } from "../../../../shared/application/use-case";
import type { Clock } from "../../../../shared/domain/clock";
import type { UserRepository } from "../../../identity/domain/repositories";
import { CannotLikeOwnProfileError } from "../../domain/errors";
import type { ProfileLikeRepository } from "../../domain/repositories";
import { requireVisibleProfile } from "../profile-access";

export interface ProfileLikeInput {
  profileUserId: string;
  userId: string;
}

export interface ProfileLikeState {
  likes: number;
  likedByMe: boolean;
}

/** Gostar de um perfil. Idempotente: repetir não duplica. */
export class LikeProfileUseCase implements UseCase<ProfileLikeInput, ProfileLikeState> {
  constructor(
    private readonly users: UserRepository,
    private readonly likes: ProfileLikeRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: ProfileLikeInput): Promise<ProfileLikeState> {
    const profile = await requireVisibleProfile(this.users, input.profileUserId);
    if (profile.id === input.userId) throw new CannotLikeOwnProfileError();
    await this.likes.add({ profileUserId: profile.id, userId: input.userId, createdAt: this.clock.now() });
    return { likes: await this.likes.count(profile.id), likedByMe: true };
  }
}

/** Retirar o gosto. Idempotente: sem gosto, não faz nada. */
export class UnlikeProfileUseCase implements UseCase<ProfileLikeInput, ProfileLikeState> {
  constructor(
    private readonly users: UserRepository,
    private readonly likes: ProfileLikeRepository,
  ) {}

  async execute(input: ProfileLikeInput): Promise<ProfileLikeState> {
    const profile = await requireVisibleProfile(this.users, input.profileUserId);
    if (profile.id === input.userId) throw new CannotLikeOwnProfileError();
    await this.likes.remove(profile.id, input.userId);
    return { likes: await this.likes.count(profile.id), likedByMe: false };
  }
}
