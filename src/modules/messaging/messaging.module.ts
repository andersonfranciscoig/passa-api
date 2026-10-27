import { Module } from "@nestjs/common";

import { Clock } from "../../shared/domain/clock";
import { IdGenerator } from "../../shared/domain/id-generator";
import { provideUseCase } from "../../shared/infrastructure/provide";
import { AnalyticsModule } from "../analytics";
import { TrackListingEventUseCase } from "../analytics/application/use-cases/track-listing-event.use-case";
import { ListConversationMessagesUseCase } from "./application/use-cases/list-conversation-messages.use-case";
import { ListMyConversationsUseCase } from "./application/use-cases/list-my-conversations.use-case";
import { MarkConversationReadUseCase } from "./application/use-cases/mark-conversation-read.use-case";
import { OpenConversationUseCase } from "./application/use-cases/open-conversation.use-case";
import { SendMessageUseCase } from "./application/use-cases/send-message.use-case";
import { StartConversationUseCase } from "./application/use-cases/start-conversation.use-case";
import { UnreadTotalUseCase } from "./application/use-cases/unread-total.use-case";
import { ConversationRepository, MessageRepository, MessagingListingCatalog } from "./domain/repositories";
import {
  PrismaConversationRepository,
  PrismaMessageRepository,
  PrismaMessagingListingCatalog,
} from "./infrastructure/prisma-messaging.repository";
import { ConversationsController } from "./presentation/http/conversations.controller";

@Module({
  imports: [AnalyticsModule],
  controllers: [ConversationsController],
  providers: [
    { provide: ConversationRepository, useClass: PrismaConversationRepository },
    { provide: MessageRepository, useClass: PrismaMessageRepository },
    { provide: MessagingListingCatalog, useClass: PrismaMessagingListingCatalog },
    provideUseCase(StartConversationUseCase, [
      ConversationRepository,
      MessagingListingCatalog,
      TrackListingEventUseCase,
      Clock,
      IdGenerator,
    ]),
    provideUseCase(SendMessageUseCase, [ConversationRepository, MessageRepository, Clock, IdGenerator]),
    provideUseCase(OpenConversationUseCase, [ConversationRepository, MessageRepository]),
    provideUseCase(ListMyConversationsUseCase, [ConversationRepository, MessageRepository]),
    provideUseCase(ListConversationMessagesUseCase, [ConversationRepository, MessageRepository]),
    provideUseCase(MarkConversationReadUseCase, [ConversationRepository, MessageRepository, Clock]),
    provideUseCase(UnreadTotalUseCase, [ConversationRepository, MessageRepository]),
  ],
})
export class MessagingModule {}
