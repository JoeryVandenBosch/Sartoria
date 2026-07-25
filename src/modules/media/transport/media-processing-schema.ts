import { z } from "zod";

export const mediaProcessingMessageSchema = z.object({
  mediaId: z.string().trim().min(1).max(200),
  ownerId: z.string().trim().min(1).max(200),
});
