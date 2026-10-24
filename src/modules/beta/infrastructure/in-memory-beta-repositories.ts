import type { BetaInvite, BetaSettings } from "../domain/beta";
import type { BetaInviteRepository, BetaSettingsRepository, InviteNotifier } from "../domain/repositories";

export class InMemoryBetaInviteRepository implements BetaInviteRepository {
  constructor(private readonly items: BetaInvite[] = []) {}

  async list() {
    return [...this.items];
  }

  async findById(id: string) {
    return this.items.find((i) => i.id === id) ?? null;
  }

  async save(invite: BetaInvite) {
    const i = this.items.findIndex((x) => x.id === invite.id);
    if (i === -1) this.items.push(invite);
    else this.items[i] = invite;
  }
}

export class InMemoryBetaSettingsRepository implements BetaSettingsRepository {
  constructor(private settings: BetaSettings = { closedBeta: true }) {}

  async get() {
    return this.settings;
  }

  async save(settings: BetaSettings) {
    this.settings = settings;
  }
}

export class SilentInviteNotifier implements InviteNotifier {
  readonly sent: BetaInvite[] = [];

  async send(invite: BetaInvite) {
    this.sent.push(invite);
  }
}
