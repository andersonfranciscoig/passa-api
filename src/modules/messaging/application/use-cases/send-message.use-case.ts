import type { UseCase } from "../../../../shared/application/use-case";
import type { Clock } from "../../../../shared/domain/clock";
import type { IdGenerator } from "../../../../shared/domain/id-generator";
import { MAX_MESSAGE_LENGTH, isParticipant, type Message } from "../../domain/conversation";
import {
  ConversationForbiddenError,
  ConversationNotFoundError,
  EmptyMessageError,
  MessageTooLongError,
} from "../../domain/errors";
import { ConversationRepository, MessageRepository } from "../../domain/repositories";
import { toMessageView } from "../conversation-view";

export interface SendMessageInput {
  conversationId: string;
  senderId: string;
  body: string;
}

export class SendMessageUseCase implements UseCase<SendMessageInput, ReturnType<typeof toMessageView>> {
  constructor(
    private readonly conversations: ConversationRepository,
    private readonly messages: MessageRepository,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
  ) {}

  async execute(input: SendMessageInput) {
    const conversation = await this.conversations.findById(input.conversationId);
    if (!conversation) throw new ConversationNotFoundError();
    if (!isParticipant(conversation, input.senderId)) throw new ConversationForbiddenError();

    const body = input.body.trim();
    if (!body) throw new EmptyMessageError();
    if (body.length > MAX_MESSAGE_LENGTH) throw new MessageTooLongError();

    const now = this.clock.now();
    const message: Message = {
      id: this.ids.next(),
      conversationId: conversation.id,
      senderId: input.senderId,
      body,
      createdAt: now,
    };
    await this.messages.save(message);
    await this.conversations.save({ ...conversation, lastMessageAt: now });
    return toMessageView(message);
  }
}
