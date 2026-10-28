import type { Conversation, ListingRef, Message } from "../domain/conversation";
import type { ConversationRepository, MessageRepository, MessagingListingCatalog } from "../domain/repositories";

export class InMemoryConversationRepository implements ConversationRepository {
  readonly items: Conversation[] = [];

  async findById(id: string) {
    return this.items.find((c) => c.id === id) ?? null;
  }

  async findByListingAndBuyer(listingId: string, buyerId: string) {
    return this.items.find((c) => c.listingId === listingId && c.buyerId === buyerId) ?? null;
  }

  async listByParticipant(userId: string) {
    return this.items.filter((c) => c.buyerId === userId || c.sellerId === userId);
  }

  async create(conversation: Conversation) {
    if (await this.findByListingAndBuyer(conversation.listingId, conversation.buyerId)) return false;
    this.items.push(conversation);
    return true;
  }

  async save(conversation: Conversation) {
    const i = this.items.findIndex((c) => c.id === conversation.id);
    if (i === -1) this.items.push(conversation);
    else this.items[i] = conversation;
  }
}

export class InMemoryMessageRepository implements MessageRepository {
  readonly items: Message[] = [];

  async listByConversation(conversationId: string) {
    return this.items
      .filter((m) => m.conversationId === conversationId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async lastOf(conversationId: string) {
    const list = await this.listByConversation(conversationId);
    return list.at(-1) ?? null;
  }

  async save(message: Message) {
    this.items.push(message);
  }

  async markRead(conversationId: string, readerId: string, at: Date) {
    for (let i = 0; i < this.items.length; i++) {
      const m = this.items[i]!;
      if (m.conversationId === conversationId && m.senderId !== readerId && !m.readAt) {
        this.items[i] = { ...m, readAt: at };
      }
    }
  }

  async countUnread(conversationIds: string[], readerId: string) {
    const counts: Record<string, number> = {};
    for (const id of conversationIds) counts[id] = 0;
    for (const m of this.items) {
      if (!(m.conversationId in counts)) continue;
      if (m.senderId === readerId || m.readAt) continue;
      counts[m.conversationId] = (counts[m.conversationId] ?? 0) + 1;
    }
    return counts;
  }
}

export class InMemoryMessagingListingCatalog implements MessagingListingCatalog {
  constructor(readonly listings: ListingRef[] = []) {}

  async find(id: string) {
    return this.listings.find((l) => l.id === id) ?? null;
  }
}
