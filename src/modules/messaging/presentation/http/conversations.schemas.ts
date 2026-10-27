import { z } from "zod";

import { MAX_MESSAGE_LENGTH } from "../../domain/conversation";

export const startConversationSchema = z.object({
  listingId: z.string().uuid(),
});

export const sendMessageSchema = z.object({
  body: z.string().min(1).max(MAX_MESSAGE_LENGTH),
});

export type StartConversationBody = z.infer<typeof startConversationSchema>;
export type SendMessageBody = z.infer<typeof sendMessageSchema>;
