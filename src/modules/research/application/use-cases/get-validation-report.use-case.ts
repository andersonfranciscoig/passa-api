import type { UseCase } from "../../../../shared/application/use-case";
import { SurveyResponseRepository } from "../../domain/repositories";
import { buildReport } from "../../domain/validation-index";
import { toReportView } from "../survey-view";

export class GetValidationReportUseCase implements UseCase<void, ReturnType<typeof toReportView>> {
  constructor(private readonly responses: SurveyResponseRepository) {}

  async execute() {
    return toReportView(buildReport(await this.responses.list()));
  }
}
