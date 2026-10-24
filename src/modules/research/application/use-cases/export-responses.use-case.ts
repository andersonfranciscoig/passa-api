import type { UseCase } from "../../../../shared/application/use-case";
import { SurveyResponseRepository } from "../../domain/repositories";
import { ALL_QUESTIONS, answerLabel } from "../../domain/survey";

export class ExportResponsesUseCase implements UseCase<void, { filename: string; csv: string }> {
  constructor(private readonly responses: SurveyResponseRepository) {}

  async execute() {
    const list = (await this.responses.list()).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const cols = ["data", "nome", "email", "telemovel", "lista_espera", ...ALL_QUESTIONS.map((x) => x.id)];
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const lines = list.map((r) =>
      [
        r.createdAt.toISOString(),
        r.contact.name ?? "",
        r.contact.email ?? "",
        r.contact.phone ?? "",
        r.betaConsent ? "sim" : "não",
        ...ALL_QUESTIONS.map((x) => answerLabel(x.id, r.answers[x.id])),
      ]
        .map((v) => esc(String(v)))
        .join(";"),
    );
    return { filename: "passa-inquerito.csv", csv: "\uFEFF" + [cols.join(";"), ...lines].join("\n") };
  }
}
