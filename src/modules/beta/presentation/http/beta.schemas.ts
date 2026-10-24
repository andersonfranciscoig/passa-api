import { z } from "zod";

const person = z.object({
  email: z.string().optional(),
  phone: z.string().optional(),
  name: z.string().optional(),
  responseId: z.string().uuid().optional(),
});

export const inviteSchema = z.object({
  people: z.array(person).min(1),
});

export const setClosedBetaSchema = z.object({
  closed: z.boolean(),
});

export type InviteBody = z.infer<typeof inviteSchema>;
export type SetClosedBetaBody = z.infer<typeof setClosedBetaSchema>;
