import type { Conversation, Message } from "../domain/conversation";

export function toConversationView(conversation: Conversation) {
  return {
    id: conversation.id,
    listingId: conversation.listingId,
    buyerId: conversation.buyerId,
    sellerId: conversation.sellerId,
    createdAt: conversation.createdAt.toISOString(),
    lastMessageAt: conversation.lastMessageAt.toISOString(),
  };
}

export function toMessageView(message: Message) {
  return {
    id: message.id,
    conversationId: message.conversationId,
    senderId: message.senderId,
    body: message.body,
    createdAt: message.createdAt.toISOString(),
    readAt: message.readAt?.toISOString(),
  };
}

export function toConversationSummaryView(input: {
  conversation: Conversation;
  counterpartId: string;
  lastMessage: Message | null;
  unread: number;
}) {
  return {
    conversation: toConversationView(input.conversation),
    counterpartId: input.counterpartId,
    lastMessage: input.lastMessage ? toMessageView(input.lastMessage) : null,
    unread: input.unread,
  };
}
