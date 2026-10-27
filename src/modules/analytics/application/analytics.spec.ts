import { describe, expect, it } from "vitest";

import { FixedClock } from "../../../shared/testing/fixed-clock";
import { InMemoryUserRepository } from "../../identity/infrastructure/in-memory-user.repository";
import type { User } from "../../identity/domain/user";
import { accessFor, allowedPeriod, redactSummary } from "../domain/access";
import { percentChange, summarize } from "../domain/insights";
import type { InsightsListing } from "../domain/repositories";
import { applyEvent, emptyDay, luandaDayKey } from "../domain/stats";
import { InMemoryAnalyticsRepository } from "../infrastructure/in-memory-analytics.repository";
import { GetListingInsightsUseCase } from "./use-cases/get-listing-insights.use-case";
import { GetSellerInsightsUseCase } from "./use-cases/get-seller-insights.use-case";
import { TrackListingEventUseCase } from "./use-cases/track-listing-event.use-case";

const NOW = new Date("2026-10-27T10:00:00.000Z");

function card(partial: Partial<InsightsListing["card"]> & Pick<InsightsListing["card"], "id" | "sellerId">): InsightsListing["card"] {
  return {
    title: "Casaco",
    slug: partial.id,
    description: "Casaco em bom estado para testes das estatísticas.",
    category: "clothing",
    condition: "good",
    terms: { mode: "sell", priceAoa: 5000, negotiable: false },
    status: "published",
    images: [],
    whatsapp: { enabled: false },
    location: { province: "Luanda", municipality: "Ingombota" },
    viewCount: 0,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    publishedAt: "2026-09-01T00:00:00.000Z",
    ...partial,
  };
}

function listing(partial: Partial<InsightsListing> & Pick<InsightsListing, "id" | "sellerId">): InsightsListing {
  const status = partial.status ?? "published";
  return {
    status,
    createdAt: new Date("2026-09-01T00:00:00.000Z"),
    publishedAt: new Date("2026-09-01T00:00:00.000Z"),
    card: card({ id: partial.id, sellerId: partial.sellerId, status, title: partial.card?.title, slug: partial.card?.slug }),
    ...partial,
  };
}

function user(id: string, extra: Partial<User> = {}): User {
  return {
    id,
    email: `${id}@passa.ao`,
    passwordHash: "x",
    displayName: extra.displayName ?? "Ana Silva",
    phone: "244911000000",
    province: "Luanda",
    municipality: "Ingombota",
    bio: "Anuncio roupa em segunda mão.",
    phoneVerifiedAt: new Date("2026-01-01"),
    role: "USER",
    status: "ACTIVE",
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...extra,
  };
}

function setup(opts?: { pro?: boolean; verified?: boolean }) {
  const clock = new FixedClock(NOW);
  const store = new InMemoryAnalyticsRepository();
  const users = new InMemoryUserRepository([
    user("seller", opts?.verified === false ? { displayName: "Ana", bio: undefined, phoneVerifiedAt: undefined } : {}),
    user("buyer", { displayName: "Mauro Costa" }),
  ]);
  store.listings.push(
    listing({ id: "11111111-1111-4111-8111-111111111111", sellerId: "seller" }),
    listing({ id: "22222222-2222-4222-8222-222222222222", sellerId: "seller", card: card({ id: "22222222-2222-4222-8222-222222222222", sellerId: "seller", title: "Sapatos", slug: "sapatos" }) }),
    listing({ id: "33333333-3333-4333-8333-333333333333", sellerId: "seller", status: "draft", card: card({ id: "33333333-3333-4333-8333-333333333333", sellerId: "seller", status: "draft", title: "Rascunho", slug: "rascunho" }) }),
  );
  if (opts?.pro) store.proUsers.add("seller");
  const track = new TrackListingEventUseCase(store, store, users, clock);
  const sellerInsights = new GetSellerInsightsUseCase(store, store, users, clock);
  const listingInsights = new GetListingInsightsUseCase(store, store, users, clock);
  return { store, track, sellerInsights, listingInsights };
}

describe("Agregação de estatísticas", () => {
  it("soma contadores, taxas e origens", () => {
    const day = luandaDayKey(NOW);
    let s = emptyDay("l", "u", day);
    for (let i = 0; i < 10; i++) s = applyEvent(s, { type: "impression", at: NOW });
    for (let i = 0; i < 4; i++) s = applyEvent(s, { type: "view", source: "search", firstView: i < 3, at: NOW });
    s = applyEvent(s, { type: "favorite", at: NOW });
    s = applyEvent(s, { type: "whatsapp", at: NOW });
    const sum = summarize([s], [day]);
    expect(sum.totals).toMatchObject({ impressions: 10, views: 4, reach: 3, saves: 1, contacts: 1 });
    expect(sum.rates.clickThrough).toBeCloseTo(0.4);
    expect(sum.sources).toEqual([{ key: "search", value: 4 }]);
  });

  it("variação face ao período anterior", () => {
    expect(percentChange(150, 100)).toBeCloseTo(0.5);
    expect(percentChange(0, 0)).toBe(0);
    expect(percentChange(5, 0)).toBeNull();
  });
});

describe("Redaction e período", () => {
  it("conta grátis não recebe impressões, taxas nem origens", () => {
    const day = luandaDayKey(NOW);
    let s = emptyDay("l", "u", day);
    s = applyEvent(s, { type: "impression", at: NOW });
    s = applyEvent(s, { type: "view", source: "home", firstView: true, at: NOW });
    const redacted = redactSummary(summarize([s], [day]), accessFor("free"));
    expect(redacted.totals.impressions).toBe(0);
    expect(redacted.totals.views).toBe(1);
    expect(redacted.rates.clickThrough).toBeNull();
    expect(redacted.sources).toEqual([]);
    expect(allowedPeriod(accessFor("free"), 30)).toBe(7);
    expect(allowedPeriod(accessFor("verified"), 90)).toBe(30);
    expect(allowedPeriod(accessFor("pro"), 90)).toBe(90);
  });
});

describe("Registo e painel", () => {
  it("ignora o próprio anunciante e anúncios não públicos", async () => {
    const { track } = setup();
    expect((await track.execute({ listingId: "11111111-1111-4111-8111-111111111111", type: "view", actorId: "seller" })).recorded).toBe(false);
    expect((await track.execute({ listingId: "33333333-3333-4333-8333-333333333333", type: "view", sessionId: "s1" })).recorded).toBe(false);
  });

  it("regista eventos públicos de visitantes", async () => {
    const { track, store } = setup();
    const id = "11111111-1111-4111-8111-111111111111";
    expect((await track.execute({ listingId: id, type: "impression", source: "home", sessionId: "s1" })).recorded).toBe(true);
    expect((await track.execute({ listingId: id, type: "view", source: "home", sessionId: "s1" })).recorded).toBe(true);
    expect((await track.execute({ listingId: id, type: "whatsapp", sessionId: "s1" })).recorded).toBe(true);
    expect(store.days[0]?.impressions).toBe(1);
    expect(store.days[0]?.views).toBe(1);
    expect(store.days[0]?.whatsapp).toBe(1);
    expect(store.days[0]?.newViewers).toBe(1);
  });

  it("conta grátis: 7 dias, top 3 e sem comparação", async () => {
    const { track, sellerInsights, store } = setup({ verified: false });
    store.listings.push(
      listing({ id: "44444444-4444-4444-8444-444444444444", sellerId: "seller", card: card({ id: "44444444-4444-4444-8444-444444444444", sellerId: "seller", title: "A", slug: "a" }) }),
      listing({ id: "55555555-5555-4555-8555-555555555555", sellerId: "seller", card: card({ id: "55555555-5555-4555-8555-555555555555", sellerId: "seller", title: "B", slug: "b" }) }),
    );
    await track.execute({ listingId: "11111111-1111-4111-8111-111111111111", type: "favorite", actorId: "buyer" });
    const r = await sellerInsights.execute({ userId: "seller", isAdmin: false, days: 30 });
    expect(r.access.tier).toBe("free");
    expect(r.days).toBe(7);
    expect(r.current.totals.impressions).toBe(0);
    expect(r.comparison.change.views).toBeUndefined();
    expect(r.ranking.length).toBeLessThanOrEqual(3);
    expect(r.rankingTotal).toBeGreaterThan(3);
    expect(r.ranking.every((x) => x.clickThrough === null)).toBe(true);
  });

  it("só o dono vê estatísticas do anúncio", async () => {
    const { listingInsights } = setup();
    await expect(
      listingInsights.execute({ listingId: "11111111-1111-4111-8111-111111111111", userId: "buyer", isAdmin: false }),
    ).rejects.toMatchObject({ code: "analytics.forbidden" });
  });

  it("não conta a mesma vista duas vezes em 10 minutos", async () => {
    const { track, store } = setup();
    const listingId = "11111111-1111-4111-8111-111111111111";
    expect((await track.execute({ listingId, type: "view", source: "search", sessionId: "s1" })).recorded).toBe(true);
    expect((await track.execute({ listingId, type: "view", source: "search", sessionId: "s1" })).recorded).toBe(false);
    expect(store.days[0]?.views).toBe(1);
  });

  it("guardados e chat incrementam saves e contactos", async () => {
    const { track, store } = setup();
    const listingId = "11111111-1111-4111-8111-111111111111";
    expect((await track.execute({ listingId, type: "favorite", actorId: "buyer" })).recorded).toBe(true);
    expect((await track.execute({ listingId, type: "chat", actorId: "buyer" })).recorded).toBe(true);
    expect(store.days[0]?.favorites).toBe(1);
    expect(store.days[0]?.chats).toBe(1);
  });

  it("Pro vê 90 dias e o efeito dos destaques", async () => {
    const { track, listingInsights, store } = setup({ pro: true });
    const id = "11111111-1111-4111-8111-111111111111";
    store.windows.set(id, [{ startsAt: new Date("2026-10-20T00:00:00.000Z"), expiresAt: new Date("2026-10-27T00:00:00.000Z") }]);
    await track.execute({ listingId: id, type: "view", source: "featured", sessionId: "s1" });
    const r = await listingInsights.execute({ listingId: id, userId: "seller", isAdmin: false, days: 90 });
    expect(r.access.tier).toBe("pro");
    expect(r.days).toBe(90);
    expect(r.promotion?.promotedDays).toBeGreaterThan(0);
    expect(r.promotionWindows).toHaveLength(1);
    expect(r.current.totals.views).toBe(1);
  });
});
