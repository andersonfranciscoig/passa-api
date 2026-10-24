import type { UseCase } from "../../../../shared/application/use-case";
import type { Clock } from "../../../../shared/domain/clock";
import { OutboundNotifications } from "../../../mail/application/outbound-notifications";
import type { BetaSettings } from "../../domain/beta";
import { BetaSettingsRepository } from "../../domain/repositories";
import { toSettingsView } from "../invite-view";

export class SetClosedBetaUseCase implements UseCase<
  { actorId: string; closed: boolean },
  ReturnType<typeof toSettingsView>
> {
  constructor(
    private readonly settings: BetaSettingsRepository,
    private readonly clock: Clock,
    private readonly notifications?: OutboundNotifications,
  ) {}

  async execute({ actorId, closed }: { actorId: string; closed: boolean }) {
    const previous = await this.settings.get();
    const next: BetaSettings = closed
      ? { closedBeta: true }
      : { closedBeta: false, openedAt: this.clock.now(), openedBy: actorId };
    await this.settings.save(next);
    if (previous.closedBeta && !closed) {
      await this.notifications?.platformOpened();
    }
    return toSettingsView(next);
  }
}
