import { describe, expect, it } from "vitest";

import { FixedClock } from "../../../shared/testing/fixed-clock";
import { SequentialIdGenerator } from "../../../shared/testing/sequential-id";
import { GetSellerInsightsUseCase } from "../../analytics/application/use-cases/get-seller-insights.use-case";
import { TrackListingEventUseCase } from "../../analytics/application/use-cases/track-listing-event.use-case";
import type { InsightsListing } from "../../analytics/domain/repositories";
import { InMemoryAnalyticsRepository } from "../../analytics/infrastructure/in-memory-analytics.repository";
import type { User } from "../../identity/domain/user";
import { InMemoryUserRepository } from "../../identity/infrastructure/in-memory-user.repository";
import { ConversationOwnListingError } from "../domain/errors";
import {
  InMemoryConversationRepository,
  InMemoryMessageRepository,
  InMemoryMessagingListingCatalog,
} from "../infrastructure/in-memory-messaging.repository";
import { SendMessageUseCase } from "./use-cases/send-message.use-case";
import { StartConversationUseCase } from "./use-cases/start-conversation.use-case";

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
  const ids = new SequentialIdGenerator();
  const conversations = new InMemoryConversationRepository();
  const messages = new InMemoryMessageRepository();
  const listings = new InMemoryMessagingListingCatalog([{ id: LISTING, sellerId: SELLER, status: "published" }]);
  const store = new InMemoryAnalyticsRepository();
  store.listings.push(listing({ id: LISTING, sellerId: SELLER }));
  store.proUsers.add(SELLER);
  const users = new InMemoryUserRepository([user(SELLER), user(BUYER, { displayName: "Mauro Costa" })]);
  const track = new TrackListingEventUseCase(store, store, users, clock);
  const sellerInsights = new GetSellerInsightsUseCase(store, store, users, clock);
  return {
    store,
    conversations,
    sellerInsights,
    start: new StartConversationUseCase(conversations, listings, track, clock, ids),
    send: new SendMessageUseCase(conversations, messages, clock, ids),
  };
}

describe("Conversas e estatísticas", () => {
  it("a primeira conversa incrementa chats/contactos; a segunda mensagem não", async () => {
    const { start, send, store, sellerInsights } = setup();
    const first = await start.execute({ buyerId: BUYER, listingId: LISTING });
    const again = await start.execute({ buyerId: BUYER, listingId: LISTING });
    expect(again.id).toBe(first.id);
    expect(store.days[0]?.chats).toBe(1);

    await send.execute({ conversationId: first.id, senderId: BUYER, body: "Ainda está disponível?" });
    await send.execute({ conversationId: first.id, senderId: SELLER, body: "Sim, está." });
    expect(store.days[0]?.chats).toBe(1);

    const insights = await sellerInsights.execute({ userId: SELLER, isAdmin: false, days: 7 });
    expect(insights.current.totals.chats).toBe(1);
    expect(insights.current.totals.contacts).toBe(1);
  });

  it("o anunciante não inicia conversa no próprio anúncio", async () => {
    const { start, store } = setup();
    await expect(start.execute({ buyerId: SELLER, listingId: LISTING })).rejects.toBeInstanceOf(ConversationOwnListingError);
    expect(store.days).toHaveLength(0);
  });
});
