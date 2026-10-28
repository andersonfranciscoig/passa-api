import { describe, expect, it } from "vitest";

import {
  activationAllowed,
  isOpenPromotion,
  paidCheckoutEnabled,
  promotionWindows,
  refreshPromotion,
  sandboxReference,
  selectFeaturedListingIds,
} from "./promotion";

const NOW = new Date("2026-10-28T10:00:00.000Z");
const DAY = 86_400_000;

function row(partial: Partial<Parameters<typeof refreshPromotion>[0]> & { status: string }) {
  return {
    promotionSource: "free_pilot",
    paymentStatus: "not_required",
    startsAt: null as Date | null,
    expiresAt: null as Date | null,
    endedReason: null as string | null,
    ...partial,
  };
}

function candidate(listingId: string, extra: Partial<Parameters<typeof selectFeaturedListingIds>[0][number]> = {}) {
  return {
    listingId,
    startsAt: extra.startsAt ?? NOW,
    category: extra.category ?? "clothing",
    title: extra.title ?? `Anúncio ${listingId}`,
    listingStatus: extra.listingStatus ?? "published",
  };
}

describe("ciclo de vida do destaque", () => {
  it("piloto gratuito não exige pagamento", () => {
    expect(activationAllowed({ promotionSource: "free_pilot", paymentStatus: "not_required" })).toBe(true);
  });

  it("destaque pago só activa com pagamento verificado", () => {
    expect(activationAllowed({ promotionSource: "paid", paymentStatus: "pending" })).toBe(false);
    expect(activationAllowed({ promotionSource: "paid", paymentStatus: "submitted" })).toBe(false);
    expect(activationAllowed({ promotionSource: "paid", paymentStatus: "verified" })).toBe(true);
  });

  it("pending, approved e active estão em curso (overlap)", () => {
    expect(isOpenPromotion("pending")).toBe(true);
    expect(isOpenPromotion("approved")).toBe(true);
    expect(isOpenPromotion("active")).toBe(true);
    expect(isOpenPromotion("expired")).toBe(false);
    expect(isOpenPromotion("rejected")).toBe(false);
    expect(isOpenPromotion("cancelled")).toBe(false);
  });

  it("expira automaticamente pelo tempo", () => {
    const active = row({
      status: "active",
      startsAt: NOW,
      expiresAt: new Date(NOW.getTime() + 3 * DAY),
    });
    expect(refreshPromotion(active, new Date(NOW.getTime() + 2 * DAY)).status).toBe("active");
    expect(refreshPromotion(active, new Date(NOW.getTime() + 3 * DAY)).status).toBe("expired");
  });

  it("approved passa a active na data de início se o pagamento o permitir", () => {
    const scheduled = row({
      status: "approved",
      startsAt: NOW,
      expiresAt: new Date(NOW.getTime() + 7 * DAY),
    });
    expect(refreshPromotion(scheduled, NOW).status).toBe("active");
    const unpaid = row({
      status: "approved",
      promotionSource: "paid",
      paymentStatus: "pending",
      startsAt: NOW,
      expiresAt: new Date(NOW.getTime() + 7 * DAY),
    });
    expect(refreshPromotion(unpaid, NOW).status).toBe("approved");
  });

  it("cobrança só com fornecedor configurado", () => {
    expect(paidCheckoutEnabled({ paidPromotionsEnabled: true, paymentProvider: "none" })).toBe(false);
    expect(paidCheckoutEnabled({ paidPromotionsEnabled: true, paymentProvider: "sandbox" })).toBe(true);
    expect(paidCheckoutEnabled({ paidPromotionsEnabled: false, paymentProvider: "sandbox" })).toBe(false);
  });
});

describe("IDs destacados por modo (home, categoria, pesquisa)", () => {
  const pool = [
    candidate("home-new", { startsAt: new Date(NOW.getTime() + 1000), category: "clothing", title: "Casaco vermelho" }),
    candidate("home-old", { startsAt: NOW, category: "electronics", title: "Telefone usado" }),
    candidate("clothes-2", { startsAt: new Date(NOW.getTime() - 1000), category: "clothing", title: "Saia azul" }),
    candidate("draft", { listingStatus: "draft", category: "clothing", title: "Rascunho" }),
    candidate("dup", { startsAt: NOW, category: "home" }),
    candidate("dup", { startsAt: new Date(NOW.getTime() + 5000), category: "home", title: "Mesa" }),
  ];

  it("home limita pelos slots e ignora anúncios não publicados", () => {
    expect(selectFeaturedListingIds(pool, { homeSlots: 2 })).toEqual(["dup", "home-new"]);
    expect(selectFeaturedListingIds(pool, { mode: "home", homeSlots: 8 })).not.toContain("draft");
  });

  it("categoria filtra pelo contexto e respeita slots", () => {
    expect(selectFeaturedListingIds(pool, { mode: "category", category: "clothing", homeSlots: 8 })).toEqual([
      "home-new",
      "clothes-2",
    ]);
    expect(selectFeaturedListingIds(pool, { mode: "category", homeSlots: 8 })).toEqual([]);
  });

  it("pesquisa usa o pool (duração 3/7/14 via planos) e filtra por texto", () => {
    expect(selectFeaturedListingIds(pool, { mode: "search", q: "telefone", homeSlots: 2 })).toEqual(["home-old"]);
    expect(selectFeaturedListingIds(pool, { mode: "search", homeSlots: 2 }).length).toBeGreaterThan(2);
  });

  it("limit explícito corta qualquer modo", () => {
    expect(selectFeaturedListingIds(pool, { mode: "search", homeSlots: 2, limit: 1 })).toEqual(["dup"]);
  });
});

describe("janelas de destaque", () => {
  it("devolve start/end/tipo das janelas que chegaram a correr", () => {
    const windows = promotionWindows([
      { startsAt: NOW, expiresAt: new Date(NOW.getTime() + DAY), status: "active", approvedBy: "admin" },
      { startsAt: NOW, expiresAt: new Date(NOW.getTime() + DAY), status: "pending", approvedBy: null },
      { startsAt: NOW, expiresAt: new Date(NOW.getTime() + DAY), status: "cancelled", approvedBy: "admin" },
      { startsAt: null, expiresAt: null, status: "rejected", approvedBy: "admin" },
    ]);
    expect(windows).toHaveLength(2);
    expect(windows[0]).toMatchObject({ startsAt: NOW, status: "active" });
    expect(windows[1]?.status).toBe("cancelled");
  });
});

describe("referência sandbox", () => {
  it("é determinística e tem 9 dígitos", () => {
    const a = sandboxReference("11111111-1111-4111-8111-111111111111");
    expect(a).toHaveLength(9);
    expect(sandboxReference("11111111-1111-4111-8111-111111111111")).toBe(a);
  });
});
