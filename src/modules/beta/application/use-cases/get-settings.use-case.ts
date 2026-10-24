import type { UseCase } from "../../../../shared/application/use-case";
import { BetaSettingsRepository } from "../../domain/repositories";
import { toSettingsView } from "../invite-view";

export class GetSettingsUseCase implements UseCase<void, ReturnType<typeof toSettingsView>> {
  constructor(private readonly settings: BetaSettingsRepository) {}

  async execute() {
    return toSettingsView(await this.settings.get());
  }
}
