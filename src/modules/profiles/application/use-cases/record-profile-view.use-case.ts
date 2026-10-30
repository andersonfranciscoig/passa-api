import { createHash } from "node:crypto";

import type { UseCase } from "../../../../shared/application/use-case";
import type { Clock } from "../../../../shared/domain/clock";
import { luandaDayKey } from "../../../analytics/domain/stats";
import type { UserRepository } from "../../../identity/domain/repositories";
import type { ProfileViewRepository } from "../../domain/repositories";
import { requireVisibleProfile } from "../profile-access";

export interface RecordProfileViewInput {
  profileUserId: string;
  /** Conta da sessão, se houver. */
  viewerId?: string;
  /** Para visitantes anónimos: IP e user-agent (só se guarda um hash). */
  ip?: string;
  userAgent?: string;
}

/**
 * Identificador do visitante (máx. 64 caracteres): a conta, ou um hash de IP + user-agent
 * para quem não tem sessão.
 */
export function profileViewerKey(input: Pick<RecordProfileViewInput, "viewerId" | "ip" | "userAgent">): string {
  if (input.viewerId) return input.viewerId.slice(0, 64);
  const hash = createHash("sha256")
    .update(`${input.ip ?? ""}|${input.userAgent ?? ""}`)
    .digest("hex");
  return `anon:${hash.slice(0, 59)}`;
}

/** Regista uma visita ao perfil: uma por visitante e dia civil (Luanda); o dono não conta. */
export class RecordProfileViewUseCase implements UseCase<RecordProfileViewInput, { recorded: boolean }> {
  constructor(
    private readonly users: UserRepository,
    private readonly views: ProfileViewRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: RecordProfileViewInput): Promise<{ recorded: boolean }> {
    const profile = await requireVisibleProfile(this.users, input.profileUserId);
    if (input.viewerId && input.viewerId === profile.id) return { recorded: false };
    const day = luandaDayKey(this.clock.now());
    const recorded = await this.views.recordView(profile.id, profileViewerKey(input), day);
    return { recorded };
  }
}
