import type { SurveyContact, SurveyResponse } from "./survey";

export abstract class SurveyResponseRepository {
  abstract list(): Promise<SurveyResponse[]>;
  abstract findByContact(contact: SurveyContact): Promise<SurveyResponse | null>;
  abstract save(response: SurveyResponse): Promise<void>;
}
