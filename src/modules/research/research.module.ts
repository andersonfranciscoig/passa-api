import { Module } from "@nestjs/common";

import { Clock } from "../../shared/domain/clock";
import { IdGenerator } from "../../shared/domain/id-generator";
import { provideUseCase } from "../../shared/infrastructure/provide";
import { OutboundNotifications } from "../mail/application/outbound-notifications";
import { ExportResponsesUseCase } from "./application/use-cases/export-responses.use-case";
import { GetValidationReportUseCase } from "./application/use-cases/get-validation-report.use-case";
import { ListResponsesUseCase } from "./application/use-cases/list-responses.use-case";
import { SubmitSurveyUseCase } from "./application/use-cases/submit-survey.use-case";
import { SurveyResponseRepository } from "./domain/repositories";
import { PrismaSurveyResponseRepository } from "./infrastructure/prisma-survey-repository";
import { AdminSurveyController } from "./presentation/http/admin-survey.controller";
import { SurveyController } from "./presentation/http/survey.controller";

@Module({
  controllers: [SurveyController, AdminSurveyController],
  providers: [
    { provide: SurveyResponseRepository, useClass: PrismaSurveyResponseRepository },
    provideUseCase(SubmitSurveyUseCase, [SurveyResponseRepository, Clock, IdGenerator, OutboundNotifications]),
    provideUseCase(ListResponsesUseCase, [SurveyResponseRepository]),
    provideUseCase(GetValidationReportUseCase, [SurveyResponseRepository]),
    provideUseCase(ExportResponsesUseCase, [SurveyResponseRepository]),
  ],
  exports: [SurveyResponseRepository],
})
export class ResearchModule {}
