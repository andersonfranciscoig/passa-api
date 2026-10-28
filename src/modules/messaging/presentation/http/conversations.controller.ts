import { Body, Controller, Get, HttpCode, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { ApiZodBody } from "../../../../shared/presentation/http/api-zod";
import { ZodValidationPipe } from "../../../../shared/presentation/http/zod-validation.pipe";
import type { AccessTokenClaims } from "../../../identity/application/ports/access-token-issuer";
import { CurrentUser } from "../../../identity/presentation/http/decorators/current-user.decorator";
import { AuthGuard } from "../../../identity/presentation/http/guards/auth.guard";
import { ListConversationMessagesUseCase } from "../../application/use-cases/list-conversation-messages.use-case";
import { ListMyConversationsUseCase } from "../../application/use-cases/list-my-conversations.use-case";
import { MarkConversationReadUseCase } from "../../application/use-cases/mark-conversation-read.use-case";
import { OpenConversationUseCase } from "../../application/use-cases/open-conversation.use-case";
import { SendMessageUseCase } from "../../application/use-cases/send-message.use-case";
import { StartConversationUseCase } from "../../application/use-cases/start-conversation.use-case";
import { UnreadTotalUseCase } from "../../application/use-cases/unread-total.use-case";
import {
  sendMessageSchema,
  startConversationSchema,
  type SendMessageBody,
  type StartConversationBody,
} from "./conversations.schemas";

@ApiTags("Mensagens")
@Controller("conversations")
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class ConversationsController {
  constructor(
    private readonly start: StartConversationUseCase,
    private readonly listMine: ListMyConversationsUseCase,
    private readonly open: OpenConversationUseCase,
    private readonly listMessages: ListConversationMessagesUseCase,
    private readonly send: SendMessageUseCase,
    private readonly markRead: MarkConversationReadUseCase,
    private readonly unread: UnreadTotalUseCase,
  ) {}

  @Get("mine")
  @ApiOperation({ summary: "Conversas da conta atual" })
  mine(@CurrentUser() account: AccessTokenClaims) {
    return this.listMine.execute(account.sub);
  }

  @Get("unread")
  @ApiOperation({ summary: "Total de mensagens por ler" })
  unreadTotal(@CurrentUser() account: AccessTokenClaims) {
    return this.unread.execute(account.sub);
  }

  @Post()
  @ApiOperation({ summary: "Iniciar ou obter conversa a partir de um anúncio" })
  @ApiZodBody(startConversationSchema)
  create(
    @CurrentUser() account: AccessTokenClaims,
    @Body(new ZodValidationPipe(startConversationSchema)) body: StartConversationBody,
  ) {
    return this.start.execute({ buyerId: account.sub, listingId: body.listingId });
  }

  @Get(":id")
  @ApiOperation({ summary: "Abrir conversa e mensagens (só participantes)" })
  show(@CurrentUser() account: AccessTokenClaims, @Param("id") id: string) {
    return this.open.execute({ conversationId: id, userId: account.sub });
  }

  @Get(":id/messages")
  @ApiOperation({ summary: "Mensagens de uma conversa" })
  messages(@CurrentUser() account: AccessTokenClaims, @Param("id") id: string) {
    return this.listMessages.execute({ conversationId: id, userId: account.sub });
  }

  @Post(":id/messages")
  @ApiOperation({ summary: "Enviar mensagem" })
  @ApiZodBody(sendMessageSchema)
  postMessage(
    @CurrentUser() account: AccessTokenClaims,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(sendMessageSchema)) body: SendMessageBody,
  ) {
    return this.send.execute({ conversationId: id, senderId: account.sub, body: body.body });
  }

  @Post(":id/read")
  @HttpCode(204)
  @ApiOperation({ summary: "Marcar mensagens da outra pessoa como lidas" })
  async read(@CurrentUser() account: AccessTokenClaims, @Param("id") id: string) {
    await this.markRead.execute({ conversationId: id, userId: account.sub });
  }
}
