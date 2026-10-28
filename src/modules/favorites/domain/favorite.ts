export interface Favorite {
  readonly userId: string;
  readonly listingId: string;
  readonly createdAt: Date;
}

export interface ListingRef {
  readonly id: string;
  readonly sellerId: string;
  readonly status: string;
}

export const PUBLIC_LISTING_STATUSES = new Set(["published", "reserved"]);
