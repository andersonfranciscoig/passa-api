import type { Conversation, ListingRef, Message } from "./conversation";

export abstract class ConversationRepository {
  abstract findById(id: string): Promise<Conversation | null>;
  abstract findByListingAndBuyer(listingId: string, buyerId: string): Promise<Conversation | null>;
  abstract listByParticipant(userId: string): Promise<Conversation[]>;
  /** `true` se criou; `false` se o par listing+buyer já existia. */
  abstract create(conversation: Conversation): Promise<boolean>;
  abstract save(conversation: Conversation): Promise<void>;
}

export abstract class MessageRepository {
  abstract listByConversation(conversationId: string): Promise<Message[]>;
  abstract lastOf(conversationId: string): Promise<Message | null>;
  abstract save(message: Message): Promise<void>;
  abstract markRead(conversationId: string, readerId: string, at: Date): Promise<void>;
  abstract countUnread(conversationIds: string[], readerId: string): Promise<Record<string, number>>;
}

export abstract class MessagingListingCatalog {
  abstract find(id: string): Promise<ListingRef | null>;
}
