import { z } from "zod";

import {
  allowedWardrobeMediaTypes,
  maximumWardrobeMediaBytes,
} from "@/modules/media/domain/wardrobe-media";

export const mediaUploadInitiationSchema = z.object({
  wardrobeItemId: z.string().trim().min(1).max(200),
  originalFilename: z
    .string()
    .trim()
    .min(1)
    .max(255)
    .transform((value) => value.split(/[\\/]/).at(-1) ?? value),
  declaredContentType: z.enum(allowedWardrobeMediaTypes),
  sizeBytes: z.number().int().min(1).max(maximumWardrobeMediaBytes),
});

export type MediaUploadInitiationRequest = z.infer<typeof mediaUploadInitiationSchema>;
