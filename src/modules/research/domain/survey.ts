import { ValidationError } from "../../../shared/domain/domain-error";
import { createAngolanPhone } from "../../../shared/domain/phone";
import { ContactRequiredError } from "./errors";

/**
 * Inquérito de validação do PASSA (descoberta de clientes). As perguntas são
 * versionadas: mudar perguntas cria uma nova versão, para não misturar dados.
 */
export const SURVEY_VERSION = "v1";

export type QuestionType = "single" | "multi" | "scale" | "text";

export interface Question {
  id: string;
  type: QuestionType;
  title: string;
  help?: string;
  options?: { value: string; label: string }[];
  scale?: { min: number; max: number; minLabel: string; maxLabel: string };
  required: boolean;
}

export interface SurveyStep {
  id: string;
  title: string;
  description?: string;
  questions: Question[];
}

const opts = (...pairs: [string, string][]) => pairs.map(([value, label]) => ({ value, label }));

export const SURVEY_STEPS: SurveyStep[] = [
  {
    id: "about",
    title: "Sobre si",
    description: "Para percebermos quem está interessado no PASSA.",
    questions: [
      {
        id: "age",
        type: "single",
        title: "Qual é a sua faixa etária?",
        required: true,
        options: opts(["u18", "Menos de 18"], ["18_24", "18–24"], ["25_34", "25–34"], ["35_44", "35–44"], ["45p", "45 ou mais"]),
      },
      {
        id: "area",
        type: "single",
        title: "Onde vive?",
        required: true,
        options: opts(
          ["Belas", "Belas"],
          ["Cacuaco", "Cacuaco"],
          ["Cazenga", "Cazenga"],
          ["Ingombota", "Ingombota"],
          ["Kilamba", "Kilamba"],
          ["Kilamba Kiaxi", "Kilamba Kiaxi"],
          ["Maianga", "Maianga"],
          ["Rangel", "Rangel"],
          ["Talatona", "Talatona"],
          ["Viana", "Viana"],
          ["outro_luanda", "Outro município de Luanda"],
          ["outra_provincia", "Outra província"],
        ),
      },
    ],
  },
  {
    id: "habits",
    title: "Os seus hábitos",
    description: "Como compra, vende ou passa artigos hoje.",
    questions: [
      {
        id: "has_items",
        type: "single",
        title: "Tem em casa artigos em bom estado que já não usa?",
        required: true,
        options: opts(["many", "Sim, muitos"], ["some", "Alguns"], ["none", "Quase nenhuns"]),
      },
      {
        id: "channels",
        type: "multi",
        title: "Como costuma comprar ou vender artigos usados?",
        help: "Escolha todas as que se aplicam.",
        required: true,
        options: opts(
          ["whatsapp", "Grupos de WhatsApp"],
          ["facebook", "Facebook / Marketplace"],
          ["instagram", "Instagram"],
          ["classifieds", "Sites de classificados"],
          ["friends", "Amigos e família"],
          ["markets", "Mercados e feiras"],
          ["never", "Nunca fiz"],
        ),
      },
      {
        id: "pain",
        type: "scale",
        title: "Quão difícil é hoje encontrar ou vender artigos usados com confiança?",
        required: true,
        scale: { min: 1, max: 5, minLabel: "Muito fácil", maxLabel: "Muito difícil" },
      },
    ],
  },
  {
    id: "concept",
    title: "O PASSA",
    description:
      "O PASSA é um marketplace onde pode vender, alugar, trocar, doar ou emprestar artigos, com pesquisa por município, chat, contacto por WhatsApp e anúncios moderados.",
    questions: [
      {
        id: "modes",
        type: "multi",
        title: "Para que usaria o PASSA?",
        required: true,
        options: opts(
          ["sell", "Vender"],
          ["buy", "Comprar"],
          ["rent", "Alugar (ex.: vestidos, ferramentas)"],
          ["exchange", "Trocar"],
          ["donate", "Doar ou receber doações"],
          ["lend", "Emprestar"],
        ),
      },
      {
        id: "intent",
        type: "single",
        title: "Usaria o PASSA nos próximos 30 dias?",
        required: true,
        options: opts(
          ["definitely", "Sim, de certeza"],
          ["probably", "Provavelmente"],
          ["maybe", "Talvez"],
          ["probably_not", "Provavelmente não"],
          ["no", "Não"],
        ),
      },
      {
        id: "categories",
        type: "multi",
        title: "Que artigos mais lhe interessam?",
        required: false,
        options: opts(
          ["clothing", "Roupa e calçado"],
          ["dresses", "Vestidos e fatos"],
          ["electronics", "Eletrónica"],
          ["home", "Casa"],
          ["books", "Livros"],
          ["kids", "Criança e bebé"],
          ["tools", "Ferramentas"],
        ),
      },
    ],
  },
  {
    id: "value",
    title: "O valor para si",
    questions: [
      {
        id: "pmf",
        type: "single",
        title: "Se o PASSA existisse e deixasse de existir, como se sentiria?",
        required: true,
        options: opts(["very", "Muito desapontado(a)"], ["somewhat", "Um pouco desapontado(a)"], ["not", "Indiferente"]),
      },
      {
        id: "pay",
        type: "single",
        title: "Pagaria para destacar um anúncio e vender mais depressa?",
        required: true,
        options: opts(["500", "Sim, até 500 Kz"], ["1000", "Sim, até 1 000 Kz"], ["2000", "Sim, até 2 000 Kz ou mais"], ["no", "Não pagaria"]),
      },
      {
        id: "trust",
        type: "multi",
        title: "O que o faria confiar numa plataforma como esta?",
        required: false,
        options: opts(
          ["verified", "Contas verificadas"],
          ["reviews", "Avaliações de outros utilizadores"],
          ["chat", "Chat dentro da plataforma"],
          ["moderation", "Moderação dos anúncios"],
          ["payment", "Pagamento protegido"],
        ),
      },
      {
        id: "nps",
        type: "scale",
        title: "De 0 a 10, qual a probabilidade de recomendar o PASSA a um amigo?",
        required: true,
        scale: { min: 0, max: 10, minLabel: "Nada provável", maxLabel: "Muito provável" },
      },
      { id: "wish", type: "text", title: "O que mais gostaria de ver no PASSA?", required: false },
    ],
  },
];

export const ALL_QUESTIONS = SURVEY_STEPS.flatMap((s) => s.questions);
export const questionById = (id: string) => ALL_QUESTIONS.find((q) => q.id === id);

export type AnswerValue = string | string[] | number;
export type Answers = Record<string, AnswerValue>;

export interface SurveyContact {
  readonly name?: string;
  readonly email?: string;
  readonly phone?: string;
}

export interface SurveyResponse {
  readonly id: string;
  readonly version: string;
  readonly contact: SurveyContact;
  readonly answers: Answers;
  readonly betaConsent: boolean;
  readonly createdAt: Date;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateAnswers(answers: Answers, questions: Question[]): Answers {
  const clean: Answers = {};
  for (const q of questions) {
    const v = answers[q.id];
    const empty = v == null || v === "" || (Array.isArray(v) && v.length === 0);
    if (empty) {
      if (q.required) throw new ValidationError("Responda a esta pergunta para continuar.", q.id);
      continue;
    }
    switch (q.type) {
      case "single":
        if (typeof v !== "string" || !q.options!.some((o) => o.value === v)) {
          throw new ValidationError("Escolha uma opção.", q.id);
        }
        break;
      case "multi":
        if (!Array.isArray(v) || !v.every((x) => q.options!.some((o) => o.value === x))) {
          throw new ValidationError("Opção inválida.", q.id);
        }
        break;
      case "scale":
        if (typeof v !== "number" || !Number.isInteger(v) || v < q.scale!.min || v > q.scale!.max) {
          throw new ValidationError("Escolha um valor da escala.", q.id);
        }
        break;
      case "text":
        if (typeof v !== "string" || v.length > 500) {
          throw new ValidationError("Máximo de 500 caracteres.", q.id);
        }
        break;
    }
    clean[q.id] = typeof v === "string" ? v.trim() : v;
  }
  return clean;
}

export function validateContact(input: { name?: string; email?: string; phone?: string }): SurveyContact {
  const email = input.email?.trim().toLowerCase() || undefined;
  const rawPhone = input.phone?.trim() || undefined;
  if (!email && !rawPhone) throw new ContactRequiredError();
  if (email && !EMAIL_RE.test(email)) throw new ValidationError("Indique um email válido.", "email");
  const phone = rawPhone ? createAngolanPhone(rawPhone, "phone") : undefined;
  const name = input.name?.trim().slice(0, 60) || undefined;
  return { name, email, phone };
}

export function answerLabel(qid: string, value: unknown): string {
  const q = questionById(qid);
  if (!q || value == null) return "—";
  if (q.type === "scale" || q.type === "text") return String(value);
  const vals = Array.isArray(value) ? value : [value];
  return vals.map((v) => q.options?.find((o) => o.value === v)?.label ?? String(v)).join(", ");
}
