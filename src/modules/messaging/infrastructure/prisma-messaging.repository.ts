import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { PrismaService } from "../../../shared/infrastructure/database/prisma.service";
import type { Conversation, Message } from "../domain/conversation";
import { ConversationRepository, MessageRepository, MessagingListingCatalog } from "../domain/repositories";

const isUniqueViolation = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";

@Injectable()
export class PrismaConversationRepository extends ConversationRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findById(id: string) {
    const row = await this.prisma.conversation.findUnique({ where: { id } });
    return row ? toConversation(row) : null;
  }

  async findByListingAndBuyer(listingId: string, buyerId: string) {
    const row = await this.prisma.conversation.findUnique({
      where: { listingId_buyerId: { listingId, buyerId } },
    });
    return row ? toConversation(row) : null;
  }

  async listByParticipant(userId: string) {
    const rows = await this.prisma.conversation.findMany({
      where: { OR: [{ buyerId: userId }, { sellerId: userId }] },
      orderBy: { lastMessageAt: "desc" },
    });
    return rows.map(toConversation);
  }

  async create(conversation: Conversation) {
    try {
      await this.prisma.conversation.create({
        data: {
          id: conversation.id,
          listingId: conversation.listingId,
          buyerId: conversation.buyerId,
          sellerId: conversation.sellerId,
          createdAt: conversation.createdAt,
          lastMessageAt: conversation.lastMessageAt,
        },
      });
      return true;
    } catch (error) {
      if (isUniqueViolation(error)) return false;
      throw error;
    }
  }

  async save(conversation: Conversation) {
    await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: conversation.lastMessageAt },
    });
  }
}

@Injectable()
export class PrismaMessageRepository extends MessageRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async listByConversation(conversationId: string) {
    const rows = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
    });
    return rows.map(toMessage);
  }

  async lastOf(conversationId: string) {
    const row = await this.prisma.message.findFirst({
      where: { conversationId },
      orderBy: { createdAt: "desc" },
    });
    return row ? toMessage(row) : null;
  }

  async save(message: Message) {
    await this.prisma.message.create({
      data: {
        id: message.id,
        conversationId: message.conversationId,
        senderId: message.senderId,
        body: message.body,
        createdAt: message.createdAt,
        readAt: message.readAt ?? null,
      },
    });
  }

  async markRead(conversationId: string, readerId: string, at: Date) {
    await this.prisma.message.updateMany({
      where: { conversationId, senderId: { not: readerId }, readAt: null },
      data: { readAt: at },
    });
  }

  async countUnread(conversationIds: string[], readerId: string) {
    if (!conversationIds.length) return {};
    const rows = await this.prisma.message.groupBy({
      by: ["conversationId"],
      where: { conversationId: { in: conversationIds }, senderId: { not: readerId }, readAt: null },
      _count: { _all: true },
    });
    return Object.fromEntries(rows.map((r) => [r.conversationId, r._count._all]));
  }
}

@Injectable()
export class PrismaMessagingListingCatalog extends MessagingListingCatalog {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async find(id: string) {
    return this.prisma.listing.findUnique({
      where: { id },
      select: { id: true, sellerId: true, status: true },
    });
  }
}

function toConversation(row: {
  id: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  createdAt: Date;
  lastMessageAt: Date;
}): Conversation {
  return {
    id: row.id,
    listingId: row.listingId,
    buyerId: row.buyerId,
    sellerId: row.sellerId,
    createdAt: row.createdAt,
    lastMessageAt: row.lastMessageAt,
  };
}

function toMessage(row: {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: Date;
  readAt: Date | null;
}): Message {
  return {
    id: row.id,
    conversationId: row.conversationId,
    senderId: row.senderId,
    body: row.body,
    createdAt: row.createdAt,
    readAt: row.readAt ?? undefined,
  };
}
