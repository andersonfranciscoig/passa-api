import { describe, expect, it } from "vitest";

import { ValidationError } from "../../../shared/domain/domain-error";
import { ContactRequiredError } from "./errors";
import { SURVEY_VERSION, validateAnswers, validateContact, type Answers } from "./survey";
import { ALL_QUESTIONS } from "./survey";

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

describe("Inquérito — validação", () => {
  it("aceita respostas completas da versão actual", () => {
    expect(SURVEY_VERSION).toBe("v1");
    expect(validateAnswers(answers, ALL_QUESTIONS)).toMatchObject(answers);
  });

  it("exige perguntas obrigatórias", () => {
    expect(() => validateAnswers({ ...answers, pmf: "" }, ALL_QUESTIONS)).toThrow(ValidationError);
    try {
      validateAnswers({ ...answers, pmf: "" }, ALL_QUESTIONS);
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).field).toBe("pmf");
    }
  });

  it("rejeita opções e escalas inválidas", () => {
    expect(() => validateAnswers({ ...answers, age: "90" }, ALL_QUESTIONS)).toThrow(ValidationError);
    expect(() => validateAnswers({ ...answers, channels: ["tiktok"] }, ALL_QUESTIONS)).toThrow(ValidationError);
    expect(() => validateAnswers({ ...answers, nps: 11 }, ALL_QUESTIONS)).toThrow(ValidationError);
  });

  it("normaliza email e telemóvel angolano", () => {
    expect(validateContact({ email: "Ana@Exemplo.AO" }).email).toBe("ana@exemplo.ao");
    expect(validateContact({ phone: "923 111 222" }).phone).toBe("244923111222");
  });

  it("exige pelo menos um contacto válido", () => {
    expect(() => validateContact({})).toThrow(ContactRequiredError);
    expect(() => validateContact({ email: "nao-e-email" })).toThrow(ValidationError);
  });
});
