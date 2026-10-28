export const MAX_MESSAGE_LENGTH = 2000;
export const PUBLIC_LISTING_STATUSES = new Set(["published", "reserved"]);

export interface Conversation {
  readonly id: string;
  readonly listingId: string;
  readonly buyerId: string;
  readonly sellerId: string;
  readonly createdAt: Date;
  readonly lastMessageAt: Date;
}

export interface Message {
  readonly id: string;
  readonly conversationId: string;
  readonly senderId: string;
  readonly body: string;
  readonly createdAt: Date;
  readonly readAt?: Date;
}

export interface ListingRef {
  readonly id: string;
  readonly sellerId: string;
  readonly status: string;
}

export function isParticipant(conversation: Conversation, userId: string): boolean {
  return conversation.buyerId === userId || conversation.sellerId === userId;
}

export function counterpartOf(conversation: Conversation, userId: string): string {
  return conversation.buyerId === userId ? conversation.sellerId : conversation.buyerId;
}
