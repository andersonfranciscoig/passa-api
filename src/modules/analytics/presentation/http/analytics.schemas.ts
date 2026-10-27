import { z } from "zod";

import { PUBLIC_TRACKED_EVENTS, SOURCES } from "../../domain/stats";

export const listingEventSchema = z.object({
  type: z.enum(PUBLIC_TRACKED_EVENTS),
  source: z.enum(SOURCES).optional(),
  sessionId: z.string().min(1).max(64),
  visitorId: z.string().min(1).max(64).optional(),
  area: z.string().min(1).max(80).optional(),
});

export type ListingEventBody = z.infer<typeof listingEventSchema>;

export const insightsQuerySchema = z.object({
  days: z.coerce.number().int().positive().max(365).optional(),
});

export type InsightsQuery = z.infer<typeof insightsQuerySchema>;
