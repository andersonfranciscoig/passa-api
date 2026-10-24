import { Body, Controller, Get, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { ApiZodBody } from "../../../../shared/presentation/http/api-zod";
import { ZodValidationPipe } from "../../../../shared/presentation/http/zod-validation.pipe";
import { surveyFormView } from "../../application/survey-view";
import { SubmitSurveyUseCase } from "../../application/use-cases/submit-survey.use-case";
import { submitSurveySchema, type SubmitSurveyBody } from "./survey.schemas";

@ApiTags("Inquérito")
@Controller("surveys")
export class SurveyController {
  constructor(private readonly submit: SubmitSurveyUseCase) {}

  @Get("form")
  @ApiOperation({ summary: "Perguntas e passos do inquérito público" })
  form() {
    return surveyFormView();
  }

  @Post()
  @ApiOperation({ summary: "Enviar respostas ao inquérito (público)" })
  @ApiZodBody(submitSurveySchema)
  create(@Body(new ZodValidationPipe(submitSurveySchema)) body: SubmitSurveyBody) {
    return this.submit.execute(body);
  }
}
