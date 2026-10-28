import type { UseCase } from "../../../../shared/application/use-case";
import { isParticipant } from "../../domain/conversation";
import { ConversationForbiddenError, ConversationNotFoundError } from "../../domain/errors";
import { ConversationRepository, MessageRepository } from "../../domain/repositories";
import { toMessageView } from "../conversation-view";

export interface ListConversationMessagesInput {
  conversationId: string;
  userId: string;
}

export class ListConversationMessagesUseCase implements UseCase<
  ListConversationMessagesInput,
  ReturnType<typeof toMessageView>[]
> {
  constructor(
    private readonly conversations: ConversationRepository,
    private readonly messages: MessageRepository,
  ) {}

  async execute(input: ListConversationMessagesInput) {
    const conversation = await this.conversations.findById(input.conversationId);
    if (!conversation) throw new ConversationNotFoundError();
    if (!isParticipant(conversation, input.userId)) throw new ConversationForbiddenError();
    const messages = await this.messages.listByConversation(conversation.id);
    return messages.map(toMessageView);
  }
}
