import type { UseCase } from "../../../../shared/application/use-case";
import type { Clock } from "../../../../shared/domain/clock";
import type { IdGenerator } from "../../../../shared/domain/id-generator";
import { OutboundNotifications } from "../../../mail/application/outbound-notifications";
import { DuplicateSurveyResponseError } from "../../domain/errors";
import { SurveyResponseRepository } from "../../domain/repositories";
import {
  ALL_QUESTIONS,
  SURVEY_VERSION,
  validateAnswers,
  validateContact,
  type Answers,
  type SurveyResponse,
} from "../../domain/survey";
import { toSurveyResponseView } from "../survey-view";

export interface SubmitSurveyInput {
  answers: Answers;
  name?: string;
  email?: string;
  phone?: string;
  betaConsent: boolean;
}

export class SubmitSurveyUseCase implements UseCase<
  SubmitSurveyInput,
  { response: ReturnType<typeof toSurveyResponseView>; waitlistPosition: number }
> {
  constructor(
    private readonly responses: SurveyResponseRepository,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
    private readonly notifications?: OutboundNotifications,
  ) {}

  async execute(input: SubmitSurveyInput) {
    const answers = validateAnswers(input.answers, ALL_QUESTIONS);
    const contact = validateContact(input);
    if (await this.responses.findByContact(contact)) {
      throw new DuplicateSurveyResponseError();
    }

    const response: SurveyResponse = {
      id: this.ids.next(),
      version: SURVEY_VERSION,
      contact,
      answers,
      betaConsent: input.betaConsent,
      createdAt: this.clock.now(),
    };
    await this.responses.save(response);
    const waitlist = (await this.responses.list()).filter((r) => r.betaConsent);
    const waitlistPosition = input.betaConsent ? waitlist.length : 0;
    await this.notifications?.surveySubmitted({
      respondentName: contact.name,
      respondentEmail: contact.email,
      respondentPhone: contact.phone,
      betaConsent: input.betaConsent,
      waitlistPosition,
    });
    return {
      response: toSurveyResponseView(response),
      waitlistPosition,
    };
  }
}
