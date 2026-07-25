import { z } from "zod";

const optionalBoundedText = (maximum: number) =>
  z
    .string()
    .max(maximum)
    .transform((value) => value.trim().replace(/\r\n?/gu, "\n") || null);

export const recommendationRequestSchema = z
  .object({
    occasion: z.string().trim().min(1).max(120),
    notes: optionalBoundedText(500),
  })
  .strict();

export const recommendationCorrectionSchema = z
  .object({
    expectedRevision: z.coerce.number().int().positive(),
    correction: z.string().trim().min(1).max(600),
  })
  .strict();

export const recommendationRejectionSchema = z
  .object({
    expectedRevision: z.coerce.number().int().positive(),
    reason: optionalBoundedText(500),
  })
  .strict();
