import type { SurveyResponse } from "../domain/survey";
import { SURVEY_STEPS, SURVEY_VERSION } from "../domain/survey";
import type { ValidationReport } from "../domain/validation-index";
import { DECISION_COPY } from "../domain/validation-index";

export function toSurveyResponseView(r: SurveyResponse) {
  return {
    id: r.id,
    version: r.version,
    contact: r.contact,
    answers: r.answers,
    betaConsent: r.betaConsent,
    createdAt: r.createdAt.toISOString(),
  };
}

export function toReportView(report: ValidationReport) {
  return {
    ...report,
    decisionCopy: DECISION_COPY[report.decision],
    wishes: report.wishes.map((w) => ({ text: w.text, at: w.at.toISOString() })),
  };
}

export function surveyFormView() {
  return {
    version: SURVEY_VERSION,
    steps: SURVEY_STEPS,
    questionCount: SURVEY_STEPS.reduce((a, s) => a + s.questions.length, 0),
  };
}
