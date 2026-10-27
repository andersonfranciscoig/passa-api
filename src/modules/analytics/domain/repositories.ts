/** Cartão de anúncio no JSON do painel (mesmo recorte que GET /listings/:id). */
export interface InsightsListingCard {
  id: string;
  sellerId: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  condition: string;
  terms: unknown;
  status: string;
  images: { id: string; ref: string; position: number }[];
  whatsapp: { enabled: boolean; phone?: string };
  location: { province: string; municipality: string; neighborhood?: string };
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface InsightsListing {
  readonly id: string;
  readonly sellerId: string;
  readonly status: string;
  readonly createdAt: Date;
  readonly publishedAt?: Date;
  readonly card: InsightsListingCard;
}

export interface PromotionWindow {
  readonly startsAt: Date;
  readonly expiresAt: Date;
}

export interface ListingSignals {
  readonly publishedListings: number;
  readonly moderatedListings: number;
}

export abstract class InsightsCatalog {
  abstract findListing(id: string): Promise<InsightsListing | null>;
  abstract listingsBySeller(sellerId: string): Promise<InsightsListing[]>;
  abstract promotionWindows(listingId: string): Promise<PromotionWindow[]>;
  abstract promotedCount(sellerId: string): Promise<number>;
  abstract listingSignals(userId: string): Promise<ListingSignals>;
  abstract hasActivePro(userId: string, now: Date): Promise<boolean>;
}
