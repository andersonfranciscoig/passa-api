import type { UseCase } from "../../../../shared/application/use-case";
import { counterpartOf } from "../../domain/conversation";
import { ConversationRepository, MessageRepository } from "../../domain/repositories";
import { toConversationSummaryView } from "../conversation-view";

export class ListMyConversationsUseCase implements UseCase<string, ReturnType<typeof toConversationSummaryView>[]> {
  constructor(
    private readonly conversations: ConversationRepository,
    private readonly messages: MessageRepository,
  ) {}

  async execute(userId: string) {
    const list = await this.conversations.listByParticipant(userId);
    const unread = await this.messages.countUnread(
      list.map((c) => c.id),
      userId,
    );
    const summaries = await Promise.all(
      list.map(async (conversation) => ({
        conversation,
        counterpartId: counterpartOf(conversation, userId),
        lastMessage: await this.messages.lastOf(conversation.id),
        unread: unread[conversation.id] ?? 0,
      })),
    );
    return summaries
      .filter((s) => s.lastMessage || s.conversation.buyerId === userId)
      .sort((a, b) => b.conversation.lastMessageAt.getTime() - a.conversation.lastMessageAt.getTime())
      .map(toConversationSummaryView);
  }
}
