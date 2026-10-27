import type { UseCase } from "../../../../shared/application/use-case";
import { isParticipant } from "../../domain/conversation";
import { ConversationForbiddenError, ConversationNotFoundError } from "../../domain/errors";
import { ConversationRepository, MessageRepository } from "../../domain/repositories";
import { toConversationView, toMessageView } from "../conversation-view";

export interface OpenConversationInput {
  conversationId: string;
  userId: string;
}

export class OpenConversationUseCase implements UseCase<
  OpenConversationInput,
  { conversation: ReturnType<typeof toConversationView>; messages: ReturnType<typeof toMessageView>[] }
> {
  constructor(
    private readonly conversations: ConversationRepository,
    private readonly messages: MessageRepository,
  ) {}

  async execute(input: OpenConversationInput) {
    const conversation = await this.conversations.findById(input.conversationId);
    if (!conversation) throw new ConversationNotFoundError();
    if (!isParticipant(conversation, input.userId)) throw new ConversationForbiddenError();
    const messages = await this.messages.listByConversation(conversation.id);
    return { conversation: toConversationView(conversation), messages: messages.map(toMessageView) };
  }
}
