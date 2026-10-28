export const OPEN_PROMOTION_STATUSES = ["pending", "approved", "active"] as const;
export const FEATURED_MODES = ["home", "search", "category"] as const;

export type FeaturedMode = (typeof FEATURED_MODES)[number];

export function isOpenPromotion(status: string): boolean {
  return (OPEN_PROMOTION_STATUSES as readonly string[]).includes(status);
}

/** Destaque só activa se for piloto gratuito ou se o pagamento estiver verificado. */
export function activationAllowed(r: { promotionSource: string; paymentStatus: string }): boolean {
  return (
    (r.promotionSource === "free_pilot" && r.paymentStatus === "not_required") ||
    (r.promotionSource === "paid" && r.paymentStatus === "verified")
  );
}

export function paidCheckoutEnabled(settings: { paidPromotionsEnabled: boolean; paymentProvider: string }): boolean {
  return settings.paidPromotionsEnabled && settings.paymentProvider !== "none";
}

type Refreshable = {
  status: string;
  promotionSource: string;
  paymentStatus: string;
  startsAt: Date | null;
  expiresAt: Date | null;
  endedReason: string | null;
};

/** Estado efectivo no instante `now` (activação agendada e expiração). */
export function refreshPromotion<T extends Refreshable>(r: T, now: Date): T {
  let status = r.status;
  let endedReason = r.endedReason;
  if ((r.status === "approved" || r.status === "active") && r.expiresAt && r.expiresAt <= now) {
    status = "expired";
    endedReason = "Prazo terminado.";
  } else if (r.status === "approved" && r.startsAt && r.startsAt <= now) {
    status = activationAllowed(r) ? "active" : "approved";
  }
  if (status === r.status) return r;
  return { ...r, status, endedReason };
}

export interface FeaturedCandidate {
  listingId: string;
  startsAt: Date;
  category: string;
  title: string;
  listingStatus: string;
}

export interface FeaturedQuery {
  mode?: FeaturedMode | string;
  category?: string;
  q?: string;
  homeSlots: number;
  limit?: number;
}

/**
 * IDs em destaque agora, por modo:
 * - home: secção da página inicial, limitada por `homeSlots`
 * - search: pool da pesquisa / Explorar (até 24, ou `limit`)
 * - category: só anúncios da categoria, limitada por `homeSlots`
 */
export function selectFeaturedListingIds(candidates: FeaturedCandidate[], opts: FeaturedQuery): string[] {
  const mode = opts.mode === "search" || opts.mode === "category" ? opts.mode : "home";
  if (mode === "category" && !opts.category) return [];

  const newestFirst = candidates
    .filter((c) => c.listingStatus === "published")
    .sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime());

  const unique: FeaturedCandidate[] = [];
  const seen = new Set<string>();
  for (const c of newestFirst) {
    if (seen.has(c.listingId)) continue;
    seen.add(c.listingId);
    unique.push(c);
  }

  const q = opts.q?.trim().toLowerCase();
  const filtered = unique.filter((c) => {
    if ((mode === "category" || opts.category) && opts.category && c.category !== opts.category) return false;
    if (q && !c.title.toLowerCase().includes(q)) return false;
    return true;
  });

  const defaultLimit = mode === "search" ? 24 : opts.homeSlots;
  const limit = opts.limit ?? defaultLimit;
  return filtered.slice(0, Math.max(0, limit)).map((c) => c.listingId);
}

export function promotionWindows<
  T extends { startsAt: Date | null; expiresAt: Date | null; status: string; approvedBy: string | null },
>(rows: T[]): { startsAt: Date; expiresAt: Date; status: string }[] {
  return rows
    .filter(
      (r) =>
        !!r.startsAt &&
        !!r.expiresAt &&
        (r.status === "active" || r.status === "expired" || (r.status === "cancelled" && r.approvedBy)),
    )
    .map((r) => ({ startsAt: r.startsAt!, expiresAt: r.expiresAt!, status: r.status }));
}

export function sandboxReference(id: string): string {
  const hex = id.replace(/-/g, "").slice(-8);
  const n = Number.parseInt(hex, 16);
  return String(100_000_000 + (Number.isFinite(n) ? n % 900_000_000 : 0));
}
