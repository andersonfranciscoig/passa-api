import type { UseCase } from "../../../../shared/application/use-case";
import { ConversationRepository, MessageRepository } from "../../domain/repositories";

export class UnreadTotalUseCase implements UseCase<string, { total: number }> {
  constructor(
    private readonly conversations: ConversationRepository,
    private readonly messages: MessageRepository,
  ) {}

  async execute(userId: string) {
    const list = await this.conversations.listByParticipant(userId);
    const counts = await this.messages.countUnread(
      list.map((c) => c.id),
      userId,
    );
    return { total: Object.values(counts).reduce((a, b) => a + b, 0) };
  }
}
