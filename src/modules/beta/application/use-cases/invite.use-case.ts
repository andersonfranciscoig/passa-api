import type { UseCase } from "../../../../shared/application/use-case";
import type { Clock } from "../../../../shared/domain/clock";
import type { IdGenerator } from "../../../../shared/domain/id-generator";
import { createAngolanPhone } from "../../../../shared/domain/phone";
import { findValidInvite, type BetaInvite } from "../../domain/beta";
import { BetaInviteRepository, InviteNotifier } from "../../domain/repositories";

export interface InvitePerson {
  email?: string;
  phone?: string;
  name?: string;
  responseId?: string;
}

export class InviteUseCase implements UseCase<
  { actorId: string; people: InvitePerson[] },
  { created: number; skipped: number }
> {
  constructor(
    private readonly invites: BetaInviteRepository,
    private readonly notifier: InviteNotifier,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
  ) {}

  async execute({ actorId, people }: { actorId: string; people: InvitePerson[] }) {
    const existing = await this.invites.list();
    let created = 0;
    let skipped = 0;

    for (const person of people) {
      const email = person.email?.trim().toLowerCase() || undefined;
      const phone = person.phone?.trim() ? createAngolanPhone(person.phone) : undefined;
      if (!email && !phone) {
        skipped++;
        continue;
      }
      if (findValidInvite(existing, { email, phone })) {
        skipped++;
        continue;
      }
      const invite: BetaInvite = {
        id: this.ids.next(),
        email,
        phone,
        name: person.name?.trim() || undefined,
        responseId: person.responseId,
        status: "invited",
        invitedBy: actorId,
        invitedAt: this.clock.now(),
      };
      await this.invites.save(invite);
      await this.notifier.send(invite);
      existing.push(invite);
      created++;
    }

    return { created, skipped };
  }
}
