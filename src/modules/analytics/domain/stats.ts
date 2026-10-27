export const TRACKED_EVENTS = ["impression", "view", "favorite", "unfavorite", "chat", "whatsapp", "share"] as const;
export type TrackedEvent = (typeof TRACKED_EVENTS)[number];

export const PUBLIC_TRACKED_EVENTS = ["impression", "view", "whatsapp", "share"] as const;
export type PublicTrackedEvent = (typeof PUBLIC_TRACKED_EVENTS)[number];

export const AUTH_TRACKED_EVENTS = ["favorite", "unfavorite", "chat"] as const;

export const SOURCES = ["home", "search", "featured", "profile", "similar", "favorites", "direct"] as const;
export type TrafficSource = (typeof SOURCES)[number];

export const isTrafficSource = (v: unknown): v is TrafficSource => typeof v === "string" && (SOURCES as readonly string[]).includes(v);
export const isTrackedEvent = (v: unknown): v is TrackedEvent => typeof v === "string" && (TRACKED_EVENTS as readonly string[]).includes(v);

export interface DailyStats {
  readonly listingId: string;
  readonly sellerId: string;
  readonly day: string;
  readonly impressions: number;
  readonly views: number;
  readonly newViewers: number;
  readonly favorites: number;
  readonly unfavorites: number;
  readonly chats: number;
  readonly whatsapp: number;
  readonly shares: number;
  readonly sources: Partial<Record<TrafficSource, number>>;
  readonly areas: Record<string, number>;
  readonly hours: Record<string, number>;
}

const LUANDA = "Africa/Luanda";
const pad = (n: number) => String(n).padStart(2, "0");

/** Dia civil em Africa/Luanda (AAAA-MM-DD). */
export function luandaDayKey(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: LUANDA, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

export function luandaHour(d: Date): number {
  const hour = new Intl.DateTimeFormat("en-GB", { timeZone: LUANDA, hour: "numeric", hour12: false }).format(d);
  const n = Number(hour);
  return Number.isFinite(n) ? n % 24 : 0;
}

export function dayKeyFromDate(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function toDayDate(day: string): Date {
  return new Date(`${day}T00:00:00.000Z`);
}

/** Lista de dias civis terminando em `end` (AAAA-MM-DD), do mais antigo para o mais recente. */
export function dayRangeFromKey(end: string, days: number): string[] {
  const [y, m, d] = end.split("-").map(Number);
  const endUtc = Date.UTC(y, m - 1, d);
  return Array.from({ length: days }, (_, i) => {
    const t = new Date(endUtc - (days - 1 - i) * 86_400_000);
    return dayKeyFromDate(t);
  });
}

export function previousEnd(currentStart: string): string {
  const [y, m, d] = currentStart.split("-").map(Number);
  return dayKeyFromDate(new Date(Date.UTC(y, m - 1, d) - 86_400_000));
}

/** Dias civis inclusivos entre duas chaves AAAA-MM-DD. */
export function daysInclusive(from: string, to: string): string[] {
  if (from > to) return [];
  const [y, m, d] = to.split("-").map(Number);
  const [fy, fm, fd] = from.split("-").map(Number);
  const n = Math.round((Date.UTC(y, m - 1, d) - Date.UTC(fy, fm - 1, fd)) / 86_400_000) + 1;
  return dayRangeFromKey(to, n);
}

export const VIEW_DEDUPE_MS = 10 * 60 * 1000;
export const LIFETIME_DAYS = 365;
export const DEFAULT_INSIGHT_DAYS = 30;

export function emptyDay(listingId: string, sellerId: string, day: string): DailyStats {
  return {
    listingId,
    sellerId,
    day,
    impressions: 0,
    views: 0,
    newViewers: 0,
    favorites: 0,
    unfavorites: 0,
    chats: 0,
    whatsapp: 0,
    shares: 0,
    sources: {},
    areas: {},
    hours: {},
  };
}

const inc = <K extends string>(map: Partial<Record<K, number>>, key: K): Partial<Record<K, number>> => ({
  ...map,
  [key]: (map[key] ?? 0) + 1,
});

export function applyEvent(
  stats: DailyStats,
  e: { type: TrackedEvent; source?: TrafficSource; viewerArea?: string; firstView?: boolean; at: Date },
): DailyStats {
  switch (e.type) {
    case "impression":
      return { ...stats, impressions: stats.impressions + 1 };
    case "view":
      return {
        ...stats,
        views: stats.views + 1,
        newViewers: stats.newViewers + (e.firstView ? 1 : 0),
        sources: inc(stats.sources, e.source ?? "direct"),
        areas: inc(stats.areas, e.viewerArea ?? "Desconhecido") as Record<string, number>,
        hours: inc(stats.hours, String(luandaHour(e.at))) as Record<string, number>,
      };
    case "favorite":
      return { ...stats, favorites: stats.favorites + 1 };
    case "unfavorite":
      return { ...stats, unfavorites: stats.unfavorites + 1 };
    case "chat":
      return { ...stats, chats: stats.chats + 1 };
    case "whatsapp":
      return { ...stats, whatsapp: stats.whatsapp + 1 };
    case "share":
      return { ...stats, shares: stats.shares + 1 };
  }
}

export interface RecordEventInput {
  listingId: string;
  sellerId: string;
  type: TrackedEvent;
  source?: TrafficSource;
  viewerArea?: string;
  visitorId?: string;
  firstView?: boolean;
  at: Date;
}

export abstract class StatsRepository {
  abstract findDay(listingId: string, day: string): Promise<DailyStats | null>;
  abstract saveDay(stats: DailyStats): Promise<void>;
  abstract listByListings(listingIds: string[], fromDay: string, toDay: string): Promise<DailyStats[]>;
  /** Regista que um visitante já viu o anúncio; devolve true se for a primeira vez. */
  abstract markViewer(listingId: string, visitorId: string): Promise<boolean>;
  /** Aplica o evento ao dia civil de Luanda (atómico na implementação Prisma). */
  abstract record(input: RecordEventInput): Promise<void>;
}
