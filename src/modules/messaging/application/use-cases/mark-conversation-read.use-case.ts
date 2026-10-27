import type { UseCase } from "../../../../shared/application/use-case";
import type { Clock } from "../../../../shared/domain/clock";
import { isParticipant } from "../../domain/conversation";
import { ConversationRepository, MessageRepository } from "../../domain/repositories";

export interface MarkConversationReadInput {
  conversationId: string;
  userId: string;
}

export class MarkConversationReadUseCase implements UseCase<MarkConversationReadInput, void> {
  constructor(
    private readonly conversations: ConversationRepository,
    private readonly messages: MessageRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: MarkConversationReadInput) {
    const conversation = await this.conversations.findById(input.conversationId);
    if (!conversation || !isParticipant(conversation, input.userId)) return;
    await this.messages.markRead(input.conversationId, input.userId, this.clock.now());
  }
}
