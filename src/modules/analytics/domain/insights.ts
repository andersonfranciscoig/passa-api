import { SOURCES, type DailyStats, type TrafficSource } from "./stats";

export const METRICS = ["views", "impressions", "reach", "saves", "contacts", "shares"] as const;
export type MetricKey = (typeof METRICS)[number];

export type Totals = Record<MetricKey, number> & { chats: number; whatsapp: number; unsaves: number };

export interface SeriesPoint extends Record<MetricKey, number> {
  day: string;
}

export interface PeriodSummary {
  days: string[];
  totals: Totals;
  rates: {
    clickThrough: number | null;
    saveRate: number | null;
    contactRate: number | null;
    engagement: number | null;
  };
  series: SeriesPoint[];
  sources: { key: TrafficSource; value: number }[];
  areas: { key: string; value: number }[];
  hours: number[];
  weekdays: number[];
  bestDay: { day: string; views: number } | null;
}

const ratio = (a: number, b: number) => (b > 0 ? a / b : null);

function emptyTotals(): Totals {
  return { views: 0, impressions: 0, reach: 0, saves: 0, contacts: 0, shares: 0, chats: 0, whatsapp: 0, unsaves: 0 };
}

export function summarize(rows: DailyStats[], days: string[]): PeriodSummary {
  const inPeriod = new Set(days);
  const byDay = new Map<string, SeriesPoint>(days.map((d) => [d, { day: d, views: 0, impressions: 0, reach: 0, saves: 0, contacts: 0, shares: 0 }]));
  const totals = emptyTotals();
  const sources = new Map<TrafficSource, number>();
  const areas = new Map<string, number>();
  const hours = Array<number>(24).fill(0);
  const weekdays = Array<number>(7).fill(0);

  for (const r of rows) {
    if (!inPeriod.has(r.day)) continue;
    const p = byDay.get(r.day)!;
    const contacts = r.chats + r.whatsapp;
    p.views += r.views;
    p.impressions += r.impressions;
    p.reach += r.newViewers;
    p.saves += r.favorites;
    p.contacts += contacts;
    p.shares += r.shares;

    totals.views += r.views;
    totals.impressions += r.impressions;
    totals.reach += r.newViewers;
    totals.saves += r.favorites;
    totals.unsaves += r.unfavorites;
    totals.contacts += contacts;
    totals.chats += r.chats;
    totals.whatsapp += r.whatsapp;
    totals.shares += r.shares;

    for (const [k, v] of Object.entries(r.sources)) sources.set(k as TrafficSource, (sources.get(k as TrafficSource) ?? 0) + (v ?? 0));
    for (const [k, v] of Object.entries(r.areas)) areas.set(k, (areas.get(k) ?? 0) + v);
    for (const [h, v] of Object.entries(r.hours)) hours[Number(h)] += v;
    const [y, m, d] = r.day.split("-").map(Number);
    weekdays[new Date(Date.UTC(y, m - 1, d)).getUTCDay()] += r.views;
  }

  const series = days.map((d) => byDay.get(d)!);
  const best = series.reduce<SeriesPoint | null>((acc, p) => (p.views > (acc?.views ?? 0) ? p : acc), null);

  return {
    days,
    totals,
    rates: {
      clickThrough: ratio(totals.views, totals.impressions),
      saveRate: ratio(totals.saves, totals.views),
      contactRate: ratio(totals.contacts, totals.views),
      engagement: ratio(totals.saves + totals.contacts + totals.shares, totals.reach),
    },
    series,
    sources: SOURCES.map((key) => ({ key, value: sources.get(key) ?? 0 }))
      .filter((s) => s.value > 0)
      .sort((a, b) => b.value - a.value),
    areas: [...areas.entries()].map(([key, value]) => ({ key, value })).sort((a, b) => b.value - a.value),
    hours,
    weekdays,
    bestDay: best && best.views > 0 ? { day: best.day, views: best.views } : null,
  };
}

export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return (current - previous) / previous;
}

export interface Milestone {
  id: string;
  label: string;
  description: string;
  current: number;
  target: number;
  achieved: boolean;
}

const milestone = (id: string, label: string, description: string, current: number, target: number): Milestone => ({
  id,
  label,
  description,
  current: Math.min(current, target),
  target,
  achieved: current >= target,
});

export function sellerMilestones(input: {
  published: number;
  completed: number;
  promoted: number;
  views: number;
  saves: number;
  contacts: number;
}): Milestone[] {
  return [
    milestone("first-listing", "Primeiro anúncio", "Publicou o primeiro artigo.", input.published, 1),
    milestone("five-listings", "Vitrine em crescimento", "5 anúncios publicados.", input.published, 5),
    milestone("views-100", "100 visualizações", "Os seus anúncios foram vistos 100 vezes.", input.views, 100),
    milestone("views-1000", "1 000 visualizações", "Mil visitas aos seus anúncios.", input.views, 1000),
    milestone("saves-10", "10 guardados", "Pessoas guardaram os seus artigos 10 vezes.", input.saves, 10),
    milestone("saves-50", "50 guardados", "Os seus artigos são populares.", input.saves, 50),
    milestone("first-contact", "Primeiro contacto", "Alguém mostrou interesse num artigo.", input.contacts, 1),
    milestone("contacts-25", "25 contactos", "Interessados a chegar com regularidade.", input.contacts, 25),
    milestone("first-deal", "Primeiro negócio", "Marcou um anúncio como concluído.", input.completed, 1),
    milestone("first-promo", "Primeiro destaque", "Destacou um anúncio na página inicial.", input.promoted, 1),
  ];
}

export function listingMilestones(totals: { views: number; saves: number; contacts: number }): Milestone[] {
  return [
    milestone("l-views-50", "50 visualizações", "O anúncio começa a ganhar tração.", totals.views, 50),
    milestone("l-views-250", "250 visualizações", "Muito procurado.", totals.views, 250),
    milestone("l-saves-10", "10 guardados", "Muitas pessoas querem voltar a ver.", totals.saves, 10),
    milestone("l-contact", "Primeiro contacto", "Recebeu a primeira mensagem ou clique no WhatsApp.", totals.contacts, 1),
    milestone("l-contacts-10", "10 contactos", "Alta procura por este artigo.", totals.contacts, 10),
  ];
}
