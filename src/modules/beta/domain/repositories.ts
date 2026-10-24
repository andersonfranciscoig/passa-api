import type { BetaInvite, BetaSettings } from "./beta";

export abstract class BetaInviteRepository {
  abstract list(): Promise<BetaInvite[]>;
  abstract findById(id: string): Promise<BetaInvite | null>;
  abstract save(invite: BetaInvite): Promise<void>;
}

export abstract class BetaSettingsRepository {
  abstract get(): Promise<BetaSettings>;
  abstract save(settings: BetaSettings): Promise<void>;
}

export abstract class InviteNotifier {
  abstract send(invite: BetaInvite): Promise<void>;
}
