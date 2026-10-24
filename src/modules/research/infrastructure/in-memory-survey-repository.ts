import type { SurveyResponseRepository } from "../domain/repositories";
import type { SurveyContact, SurveyResponse } from "../domain/survey";

export class InMemorySurveyResponseRepository implements SurveyResponseRepository {
  constructor(private readonly items: SurveyResponse[] = []) {}

  async list() {
    return [...this.items];
  }

  async findByContact(contact: SurveyContact) {
    return (
      this.items.find(
        (r) =>
          (!!contact.email && r.contact.email === contact.email) ||
          (!!contact.phone && r.contact.phone === contact.phone),
      ) ?? null
    );
  }

  async save(response: SurveyResponse) {
    const i = this.items.findIndex((r) => r.id === response.id);
    if (i === -1) this.items.push(response);
    else this.items[i] = response;
  }
}
