import { describe, expect, it } from "vitest";

import { FixedClock } from "../../../shared/testing/fixed-clock";
import { SequentialIdGenerator } from "../../../shared/testing/sequential-id";
import { DuplicateSurveyResponseError } from "../domain/errors";
import type { Answers } from "../domain/survey";
import { InMemorySurveyResponseRepository } from "../infrastructure/in-memory-survey-repository";
import { SubmitSurveyUseCase } from "./use-cases/submit-survey.use-case";

const answers: Answers = {
  age: "25_34",
  area: "Talatona",
  has_items: "many",
  channels: ["whatsapp"],
  pain: 4,
  modes: ["sell", "buy"],
  intent: "definitely",
  pmf: "very",
  pay: "500",
  nps: 9,
};

const create = () => {
  const responses = new InMemorySurveyResponseRepository();
  return {
    responses,
    submit: new SubmitSurveyUseCase(responses, new FixedClock(), new SequentialIdGenerator()),
  };
};

describe("Enviar inquérito", () => {
  it("guarda a resposta e devolve a posição na lista de espera", async () => {
    const { submit } = create();
    const r = await submit.execute({ answers, phone: "923 111 222", betaConsent: true });
    expect(r.response.contact.phone).toBe("244923111222");
    expect(r.waitlistPosition).toBe(1);
  });

  it("não entra na lista de espera sem consentimento", async () => {
    const { submit } = create();
    const r = await submit.execute({ answers, email: "a@b.ao", betaConsent: false });
    expect(r.waitlistPosition).toBe(0);
  });

  it("aceita apenas uma resposta por contacto", async () => {
    const { submit } = create();
    await submit.execute({ answers, email: "unica@exemplo.ao", betaConsent: false });
    await expect(submit.execute({ answers, email: "UNICA@exemplo.ao", betaConsent: false })).rejects.toBeInstanceOf(
      DuplicateSurveyResponseError,
    );
  });
});
