import { z } from "zod";

export const signInSchema = z.object({
  email: z.string().min(1),
  password: z.string().min(1),
});

export const registerSchema = z.object({
  email: z.string().min(1),
  password: z.string().min(1),
  displayName: z.string().min(1),
  acceptTerms: z.boolean(),
  phone: z.string().optional(),
  province: z.string().optional(),
  municipality: z.string().optional(),
  neighborhood: z.string().optional(),
});

export type SignInBody = z.infer<typeof signInSchema>;
export type RegisterBody = z.infer<typeof registerSchema>;

export const updateProfileSchema = z.object({
  displayName: z.string().optional(),
  bio: z.string().optional(),
  avatarUrl: z.string().optional(),
  phone: z.string().optional(),
  province: z.string().optional(),
  municipality: z.string().optional(),
  neighborhood: z.string().optional(),
});
export type UpdateProfileBody = z.infer<typeof updateProfileSchema>;

export const confirmContactSchema = z.object({
  code: z.string().min(1),
});
export type ConfirmContactBody = z.infer<typeof confirmContactSchema>;
