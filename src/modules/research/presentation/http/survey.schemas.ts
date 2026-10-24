import { z } from "zod";

const answerValue = z.union([z.string(), z.array(z.string()), z.number()]);

export const submitSurveySchema = z.object({
  answers: z.record(z.string(), answerValue),
  name: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  betaConsent: z.boolean(),
});

export type SubmitSurveyBody = z.infer<typeof submitSurveySchema>;
