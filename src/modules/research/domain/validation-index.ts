import { ALL_QUESTIONS, type SurveyResponse } from "./survey";

export const MIN_SAMPLE = 30;

export type SignalId = "pmf" | "intent" | "supply" | "pain" | "pay" | "nps";

export interface Signal {
  id: SignalId;
  label: string;
  description: string;
  value: number | null;
  target: number;
  unit: "percent" | "nps";
  weight: number;
  achievement: number;
  met: boolean;
}

export type Decision = "insufficient" | "continue" | "iterate" | "rethink";

export const DECISION_COPY: Record<Decision, { title: string; text: string }> = {
  insufficient: {
    title: "Amostra ainda insuficiente",
    text: `São precisas pelo menos ${MIN_SAMPLE} respostas para uma decisão fiável. O índice abaixo é provisório.`,
  },
  continue: {
    title: "Continuar — sinais fortes",
    text: "As pessoas sentem o problema, querem usar e ficariam desapontadas sem o PASSA. Avance para o piloto com utilizadores reais.",
  },
  iterate: {
    title: "Continuar com ajustes",
    text: "Há interesse, mas alguns sinais estão abaixo da meta. Ajuste a proposta (modalidades, público, mensagem) e volte a medir.",
  },
  rethink: {
    title: "Repensar a proposta",
    text: "O interesse é fraco. Antes de investir mais, reveja o problema, o público-alvo ou a solução.",
  },
};

const share = (list: SurveyResponse[], pred: (r: SurveyResponse) => boolean) =>
  list.length ? list.filter(pred).length / list.length : null;

const has = (r: SurveyResponse, q: string, v: string) => {
  const a = r.answers[q];
  return Array.isArray(a) ? a.includes(v) : a === v;
};

const SUPPLY_MODES = ["sell", "rent", "exchange", "donate", "lend"];

export function npsOf(list: SurveyResponse[]): number | null {
  const scores = list.map((r) => r.answers.nps).filter((v): v is number => typeof v === "number");
  if (!scores.length) return null;
  const promoters = scores.filter((s) => s >= 9).length;
  const detractors = scores.filter((s) => s <= 6).length;
  return Math.round(((promoters - detractors) / scores.length) * 100);
}

function signal(base: Omit<Signal, "achievement" | "met">): Signal {
  const v = base.value;
  const achievement = v == null ? 0 : Math.max(0, Math.min(1, v / base.target));
  return { ...base, achievement, met: v != null && v >= base.target };
}

export function computeSignals(list: SurveyResponse[]): Signal[] {
  return [
    signal({
      id: "pmf",
      label: "Ficariam muito desapontados sem o PASSA",
      description: "Teste de Sean Ellis. Acima de 40% indica forte encaixe entre produto e mercado.",
      value: share(list, (r) => r.answers.pmf === "very"),
      target: 0.4,
      unit: "percent",
      weight: 30,
    }),
    signal({
      id: "intent",
      label: "Usariam nos próximos 30 dias",
      description: "Respostas “Sim, de certeza” ou “Provavelmente”.",
      value: share(list, (r) => r.answers.intent === "definitely" || r.answers.intent === "probably"),
      target: 0.6,
      unit: "percent",
      weight: 20,
    }),
    signal({
      id: "supply",
      label: "Potenciais anunciantes",
      description: "Têm artigos parados em casa e querem vender, alugar, trocar, doar ou emprestar.",
      value: share(list, (r) => r.answers.has_items !== "none" && SUPPLY_MODES.some((m) => has(r, "modes", m))),
      target: 0.5,
      unit: "percent",
      weight: 15,
    }),
    signal({
      id: "pain",
      label: "Sentem o problema",
      description: "Dificuldade 4 ou 5 (em 5) para encontrar ou vender usados com confiança.",
      value: share(list, (r) => typeof r.answers.pain === "number" && r.answers.pain >= 4),
      target: 0.5,
      unit: "percent",
      weight: 15,
    }),
    signal({
      id: "pay",
      label: "Pagariam por um destaque",
      description: "Indica potencial de monetização (não é uma promessa de pagamento).",
      value: share(list, (r) => typeof r.answers.pay === "string" && r.answers.pay !== "no"),
      target: 0.25,
      unit: "percent",
      weight: 10,
    }),
    signal({
      id: "nps",
      label: "NPS (recomendação)",
      description: "Promotores (9–10) menos detratores (0–6). Acima de 30 é bom.",
      value: npsOf(list),
      target: 30,
      unit: "nps",
      weight: 10,
    }),
  ];
}

export interface ValidationReport {
  responses: number;
  index: number;
  decision: Decision;
  signals: Signal[];
  pmfMargin: number | null;
  distributions: Record<string, { value: string; label: string; count: number }[]>;
  averages: { pain: number | null; nps: number | null };
  wishes: { text: string; at: Date }[];
  bySegment: { label: string; responses: number; pmf: number | null }[];
  betaConsents: number;
}

export function buildReport(list: SurveyResponse[]): ValidationReport {
  const signals = computeSignals(list);
  const totalWeight = signals.reduce((a, s) => a + s.weight, 0);
  const index = Math.round((signals.reduce((a, s) => a + s.achievement * s.weight, 0) / totalWeight) * 100);
  const pmf = signals.find((s) => s.id === "pmf")!;

  let decision: Decision;
  if (list.length < MIN_SAMPLE) decision = "insufficient";
  else if (index >= 75 && pmf.met) decision = "continue";
  else if (index >= 50) decision = "iterate";
  else decision = "rethink";

  const distributions: ValidationReport["distributions"] = {};
  for (const q of ALL_QUESTIONS) {
    if (q.type === "single" || q.type === "multi") {
      distributions[q.id] = q.options!.map((o) => ({
        value: o.value,
        label: o.label,
        count: list.filter((r) => has(r, q.id, o.value)).length,
      }));
    } else if (q.type === "scale") {
      const { min, max } = q.scale!;
      distributions[q.id] = Array.from({ length: max - min + 1 }, (_, i) => {
        const v = min + i;
        return { value: String(v), label: String(v), count: list.filter((r) => r.answers[q.id] === v).length };
      });
    }
  }

  const avg = (q: string) => {
    const vals = list.map((r) => r.answers[q]).filter((v): v is number => typeof v === "number");
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  };

  const segment = (label: string, pred: (r: SurveyResponse) => boolean) => {
    const sub = list.filter(pred);
    return { label, responses: sub.length, pmf: share(sub, (r) => r.answers.pmf === "very") };
  };

  return {
    responses: list.length,
    index,
    decision,
    signals,
    pmfMargin:
      pmf.value != null && list.length
        ? Math.round(1.96 * Math.sqrt((pmf.value * (1 - pmf.value)) / list.length) * 1000) / 10
        : null,
    distributions,
    averages: { pain: avg("pain"), nps: npsOf(list) },
    wishes: list
      .filter((r) => typeof r.answers.wish === "string" && r.answers.wish)
      .map((r) => ({ text: r.answers.wish as string, at: r.createdAt }))
      .sort((a, b) => b.at.getTime() - a.at.getTime()),
    bySegment: [
      segment("Querem anunciar (vender, alugar, trocar, doar, emprestar)", (r) =>
        SUPPLY_MODES.some((m) => has(r, "modes", m)),
      ),
      segment("Só querem comprar", (r) => has(r, "modes", "buy") && !SUPPLY_MODES.some((m) => has(r, "modes", m))),
      segment("18–34 anos", (r) => r.answers.age === "18_24" || r.answers.age === "25_34"),
      segment("35 anos ou mais", (r) => r.answers.age === "35_44" || r.answers.age === "45p"),
      segment("Interessados em alugar", (r) => has(r, "modes", "rent")),
    ],
    betaConsents: list.filter((r) => r.betaConsent).length,
  };
}
