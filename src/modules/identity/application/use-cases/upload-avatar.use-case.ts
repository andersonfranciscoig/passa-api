import type { UseCase } from "../../../../shared/application/use-case";
import { AppConfig } from "../../../../config/app-config";
import { FileStorage, validateAvatarUpload } from "../../../../shared/application/file-storage";
import { AccountNotFoundError } from "../../domain/errors";
import type { UserRepository } from "../../domain/repositories";
import { toUserView, type UserView } from "../user-view";

export class UploadAvatarUseCase implements UseCase<{ userId: string; file?: { name: string; data: Uint8Array } }, UserView> {
  constructor(
    private readonly users: UserRepository,
    private readonly storage: FileStorage,
    private readonly config: AppConfig,
  ) {}

  async execute(input: { userId: string; file?: { name: string; data: Uint8Array } }): Promise<UserView> {
    const user = await this.users.findById(input.userId);
    if (!user) throw new AccountNotFoundError();
    const file = validateAvatarUpload(input.file, this.config.storage.maxBytes);
    const stored = await this.storage.upload(file, `avatars/${user.id}`);
    const previous = user.avatarUrl;
    await this.users.save({ ...user, avatarUrl: stored.url, updatedAt: new Date() });
    const oldKey = uploadthingKey(previous);
    if (oldKey) await this.storage.delete([oldKey]).catch(() => undefined);
    return toUserView({ ...user, avatarUrl: stored.url, updatedAt: new Date() });
  }
}

function uploadthingKey(url?: string) {
  if (!url) return undefined;
  try {
    const path = new URL(url).pathname;
    const match = path.match(/\/(?:f|a)\/([^/?#]+)/);
    return match?.[1];
  } catch {
    return undefined;
  }
}
