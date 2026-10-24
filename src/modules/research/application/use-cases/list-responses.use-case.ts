import type { UseCase } from "../../../../shared/application/use-case";
import { SurveyResponseRepository } from "../../domain/repositories";
import { toSurveyResponseView } from "../survey-view";

export class ListResponsesUseCase implements UseCase<void, ReturnType<typeof toSurveyResponseView>[]> {
  constructor(private readonly responses: SurveyResponseRepository) {}

  async execute() {
    const list = await this.responses.list();
    return list
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map(toSurveyResponseView);
  }
}
