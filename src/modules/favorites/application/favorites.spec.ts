import { describe, expect, it } from "vitest";

import { FixedClock } from "../../../shared/testing/fixed-clock";
import { TrackListingEventUseCase } from "../../analytics/application/use-cases/track-listing-event.use-case";
import { GetSellerInsightsUseCase } from "../../analytics/application/use-cases/get-seller-insights.use-case";
import type { InsightsListing } from "../../analytics/domain/repositories";
import { InMemoryAnalyticsRepository } from "../../analytics/infrastructure/in-memory-analytics.repository";
import type { User } from "../../identity/domain/user";
import { InMemoryUserRepository } from "../../identity/infrastructure/in-memory-user.repository";
import { FavoriteOwnListingError, FavoriteListingNotFoundError } from "../domain/errors";
import { InMemoryFavoriteListingCatalog, InMemoryFavoriteRepository } from "../infrastructure/in-memory-favorite.repository";
import { CountListingFavoritesUseCase } from "./use-cases/count-listing-favorites.use-case";
import { SaveFavoriteUseCase } from "./use-cases/save-favorite.use-case";
import { UnfavoriteUseCase } from "./use-cases/unfavorite.use-case";

const NOW = new Date("2026-10-27T10:00:00.000Z");
const LISTING = "11111111-1111-4111-8111-111111111111";
const SELLER = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const BUYER = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

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

function listing(partial: Partial<InsightsListing> & Pick<InsightsListing, "id" | "sellerId">): InsightsListing {
  const status = partial.status ?? "published";
  return {
    status,
    createdAt: new Date("2026-09-01T00:00:00.000Z"),
    publishedAt: new Date("2026-09-01T00:00:00.000Z"),
    card: {
      id: partial.id,
      sellerId: partial.sellerId,
      title: "Casaco",
      slug: partial.id,
      description: "Casaco em bom estado.",
      category: "clothing",
      condition: "good",
      terms: { mode: "sell", priceAoa: 5000, negotiable: false },
      status,
      images: [],
      whatsapp: { enabled: false },
      location: { province: "Luanda", municipality: "Ingombota" },
      viewCount: 0,
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
      publishedAt: "2026-09-01T00:00:00.000Z",
    },
    ...partial,
  };
}

function setup() {
  const clock = new FixedClock(NOW);
  const favorites = new InMemoryFavoriteRepository();
  const listings = new InMemoryFavoriteListingCatalog([
    { id: LISTING, sellerId: SELLER, status: "published" },
    { id: "draft", sellerId: SELLER, status: "draft" },
  ]);
  const store = new InMemoryAnalyticsRepository();
  store.listings.push(listing({ id: LISTING, sellerId: SELLER }));
  store.proUsers.add(SELLER);
  const users = new InMemoryUserRepository([user(SELLER), user(BUYER, { displayName: "Mauro Costa" })]);
  const track = new TrackListingEventUseCase(store, store, users, clock);
  const sellerInsights = new GetSellerInsightsUseCase(store, store, users, clock);
  return {
    favorites,
    store,
    sellerInsights,
    save: new SaveFavoriteUseCase(favorites, listings, track, clock),
    unfavorite: new UnfavoriteUseCase(favorites, listings, track),
    count: new CountListingFavoritesUseCase(favorites),
  };
}

describe("Favoritos e estatísticas", () => {
  it("guardar incrementa saves uma vez (idempotente)", async () => {
    const { save, store, sellerInsights, favorites, count } = setup();
    await save.execute({ userId: BUYER, listingId: LISTING });
    await save.execute({ userId: BUYER, listingId: LISTING });
    expect(favorites.items).toHaveLength(1);
    expect(store.days[0]?.favorites).toBe(1);
    expect((await count.execute(LISTING)).count).toBe(1);
    const insights = await sellerInsights.execute({ userId: SELLER, isAdmin: false, days: 7 });
    expect(insights.current.totals.saves).toBe(1);
  });

  it("remover incrementa unsaves e não volta a incrementar se já não estava guardado", async () => {
    const { save, unfavorite, store, sellerInsights } = setup();
    await save.execute({ userId: BUYER, listingId: LISTING });
    await unfavorite.execute({ userId: BUYER, listingId: LISTING });
    await unfavorite.execute({ userId: BUYER, listingId: LISTING });
    expect(store.days[0]?.favorites).toBe(1);
    expect(store.days[0]?.unfavorites).toBe(1);
    const insights = await sellerInsights.execute({ userId: SELLER, isAdmin: false, days: 7 });
    expect(insights.current.totals.saves).toBe(1);
    expect(insights.current.totals.unsaves).toBe(1);
  });

  it("o anunciante não guarda o próprio anúncio", async () => {
    const { save, store } = setup();
    await expect(save.execute({ userId: SELLER, listingId: LISTING })).rejects.toBeInstanceOf(FavoriteOwnListingError);
    expect(store.days).toHaveLength(0);
  });

  it("anúncio inexistente ou rascunho não pode ser guardado", async () => {
    const { save } = setup();
    await expect(save.execute({ userId: BUYER, listingId: "missing" })).rejects.toBeInstanceOf(FavoriteListingNotFoundError);
    await expect(save.execute({ userId: BUYER, listingId: "draft" })).rejects.toBeInstanceOf(FavoriteListingNotFoundError);
  });
});
