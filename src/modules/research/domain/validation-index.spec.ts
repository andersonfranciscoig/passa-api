import { describe, expect, it } from "vitest";

import type { Answers, SurveyResponse } from "./survey";
import { buildReport, MIN_SAMPLE } from "./validation-index";

const base: Answers = {
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

const response = (a: Partial<Answers>, i: number): SurveyResponse => ({
  id: `r${i}`,
  version: "v1",
  contact: { email: `p${i}@x.ao` },
  answers: { ...base, ...a } as Answers,
  betaConsent: true,
  createdAt: new Date(),
});

describe("Índice de validação", () => {
  it("sem amostra suficiente a decisão é provisória", () => {
    expect(buildReport([response({}, 1)]).decision).toBe("insufficient");
  });

  it("sinais fortes levam a continuar", () => {
    const list = Array.from({ length: MIN_SAMPLE }, (_, i) => response({}, i));
    const r = buildReport(list);
    expect(r.index).toBe(100);
    expect(r.decision).toBe("continue");
  });

  it("sinais fracos levam a repensar", () => {
    const weak = { pmf: "not", intent: "no", has_items: "none", modes: ["buy"], pain: 2, pay: "no", nps: 3 };
    const r = buildReport(Array.from({ length: MIN_SAMPLE }, (_, i) => response(weak, i)));
    expect(r.decision).toBe("rethink");
    expect(r.signals.every((s) => !s.met)).toBe(true);
  });

  it("calcula o NPS corretamente", () => {
    const list = [9, 10, 7, 3].map((nps, i) => response({ nps }, i));
    expect(buildReport(list).averages.nps).toBe(25);
  });
});
