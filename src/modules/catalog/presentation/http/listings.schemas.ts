import { z } from "zod";

export const listingDraftSchema = z.object({
  title: z.string(),
  description: z.string().optional().default(""),
  category: z.string(),
  condition: z.string(),
  mode: z.enum(["sell", "rent", "exchange", "donate", "lend"]),
  priceAoa: z.union([z.number(), z.string()]).optional(),
  negotiable: z.boolean().optional(),
  rentalPeriod: z.string().optional(),
  conditions: z.string().optional(),
  wantedInExchange: z.string().optional(),
  pickupNotes: z.string().optional(),
  returnPeriodDays: z.union([z.number(), z.string()]).optional(),
  imageRefs: z.array(z.string()).optional().default([]),
  whatsappEnabled: z.boolean().optional().default(false),
  whatsappPhone: z.string().optional(),
  province: z.string(),
  municipality: z.string(),
  neighborhood: z.string().optional(),
  publish: z.boolean().optional(),
});

export type ListingDraftBody = z.infer<typeof listingDraftSchema>;

export const listingStatusSchema = z.object({
  status: z.enum(["published", "reserved", "completed", "archived"]),
});

export type ListingStatusBody = z.infer<typeof listingStatusSchema>;

export const listingSearchSchema = z.object({
  query: z.string().optional(),
  category: z.string().optional(),
  modes: z.string().optional(),
  conditions: z.string().optional(),
  province: z.string().optional(),
  municipality: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  sort: z.enum(["recent", "price_asc", "price_desc"]).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(48).optional(),
});

export type ListingSearchQuery = z.infer<typeof listingSearchSchema>;
