import { z } from "zod";

export const reportBodySchema = z.object({
  listingId: z.string().uuid(),
  reason: z.string().min(1),
  details: z.string().optional(),
});
export type ReportBody = z.infer<typeof reportBodySchema>;

export const resolveReportSchema = z.object({
  decision: z.enum(["dismissed", "actioned"]),
  note: z.string().optional(),
});
export type ResolveReportBody = z.infer<typeof resolveReportSchema>;

export const profilesQuerySchema = z.object({
  ids: z.string().optional(),
});

export const noteSchema = z.object({
  note: z.string().optional(),
  durationDays: z.union([z.number(), z.string()]).optional(),
});
export type NoteBody = z.infer<typeof noteSchema>;

export const reasonSchema = z.object({
  reason: z.string().optional(),
  note: z.string().optional(),
});
export type ReasonBody = z.infer<typeof reasonSchema>;

export const grantPromotionSchema = z.object({
  listingId: z.string().uuid(),
  planId: z.string().uuid(),
  durationDays: z.union([z.number(), z.string()]).optional(),
  note: z.string().optional(),
});
export type GrantPromotionBody = z.infer<typeof grantPromotionSchema>;

export const requestPromotionSchema = z.object({
  listingId: z.string().uuid(),
  planId: z.string().uuid(),
});
export type RequestPromotionBody = z.infer<typeof requestPromotionSchema>;

export const featuredQuerySchema = z.object({
  mode: z.enum(["home", "search", "category"]).optional(),
  category: z.string().optional(),
  q: z.string().optional(),
  limit: z.coerce.number().int().positive().max(48).optional(),
});
export type FeaturedQuery = z.infer<typeof featuredQuerySchema>;

export const simulatePaymentSchema = z.object({
  entity: z.string().min(1),
  reference: z.string().min(1),
  amountAoa: z.number().int().positive(),
  pin: z.string().regex(/^\d{4}$/),
});
export type SimulatePaymentBody = z.infer<typeof simulatePaymentSchema>;

export const savePlanSchema = z.object({
  id: z.string().uuid().nullable().optional(),
  kind: z.enum(["promotion", "subscription"]).optional(),
  name: z.string(),
  description: z.string(),
  durationDays: z.union([z.number(), z.string()]),
  priceAoa: z.union([z.number(), z.string()]),
  isActive: z.boolean(),
});
export type SavePlanBody = z.infer<typeof savePlanSchema>;

export const settingsSchema = z.object({
  promotionsEnabled: z.boolean().optional(),
  paidPromotionsEnabled: z.boolean().optional(),
  homeSlots: z.number().int().optional(),
  paidSubscriptionsEnabled: z.boolean().optional(),
  paymentProvider: z.enum(["none", "sandbox"]).optional(),
  referenceEntity: z.string().optional(),
  referenceTtlHours: z.number().int().optional(),
});
export type SettingsBody = z.infer<typeof settingsSchema>;

export const grantSubscriptionSchema = z.object({
  userId: z.string().uuid(),
  durationDays: z.union([z.number(), z.string()]).optional(),
  note: z.string().optional(),
});
export type GrantSubscriptionBody = z.infer<typeof grantSubscriptionSchema>;

export const refundSchema = z.object({
  reason: z.string().optional(),
});
export type RefundBody = z.infer<typeof refundSchema>;

export const userStatusSchema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED"]),
});
export type UserStatusBody = z.infer<typeof userStatusSchema>;
