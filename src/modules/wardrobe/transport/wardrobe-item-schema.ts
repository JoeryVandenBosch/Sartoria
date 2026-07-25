import { z } from "zod";

import {
  ownershipStatuses,
  wardrobeCategories,
  type NewWardrobeItem,
} from "@/modules/wardrobe/domain/wardrobe-item";

const acquisitionAmountPattern = /^\d{1,9}(?:[.,]\d{1,2})?$/u;

export const wardrobeItemFormSchema = z
  .object({
    category: z.enum(wardrobeCategories),
    name: z.string().trim().min(1, "Name is required").max(120),
    brand: z.string().trim().max(120).optional(),
    primaryColor: z.string().trim().min(1, "Primary colour is required").max(80),
    ownershipStatus: z.enum(ownershipStatuses).default("owned"),
    fitNotes: z.string().trim().max(500).optional(),
    acquisitionCost: z.string().trim().max(20).optional().default(""),
    acquisitionCurrency: z
      .string()
      .trim()
      .transform((value) => value.toUpperCase())
      .pipe(z.string().max(3))
      .optional()
      .default(""),
  })
  .superRefine((value, context) => {
    const hasAmount = value.acquisitionCost.length > 0;
    const hasCurrency = value.acquisitionCurrency.length > 0;

    if (hasAmount !== hasCurrency) {
      context.addIssue({
        code: "custom",
        path: [hasAmount ? "acquisitionCurrency" : "acquisitionCost"],
        message: "Amount and currency must be recorded together.",
      });
    }

    if (hasAmount && !acquisitionAmountPattern.test(value.acquisitionCost)) {
      context.addIssue({
        code: "custom",
        path: ["acquisitionCost"],
        message: "Use a positive amount with at most two decimal places.",
      });
    }

    if (hasCurrency && !/^[A-Z]{3}$/u.test(value.acquisitionCurrency)) {
      context.addIssue({
        code: "custom",
        path: ["acquisitionCurrency"],
        message: "Use a three-letter currency code such as EUR.",
      });
    }

    if ((hasAmount || hasCurrency) && value.ownershipStatus !== "owned") {
      context.addIssue({
        code: "custom",
        path: ["acquisitionCost"],
        message: "Acquisition cost can only be recorded for an owned item.",
      });
    }
  });

export type WardrobeItemFormInput = z.input<typeof wardrobeItemFormSchema>;

function acquisitionCostMinor(value: string): number | null {
  if (!value) {
    return null;
  }
  const [major, fractional = ""] = value.replace(",", ".").split(".");
  const minor = Number(major) * 100 + Number(fractional.padEnd(2, "0"));
  return Number.isSafeInteger(minor) && minor > 0 ? minor : null;
}

export function parseNewWardrobeItem(
  ownerId: string,
  input: WardrobeItemFormInput,
): NewWardrobeItem {
  const parsed = wardrobeItemFormSchema.parse(input);

  return {
    ownerId,
    category: parsed.category,
    name: parsed.name,
    brand: parsed.brand || null,
    primaryColor: parsed.primaryColor,
    ownershipStatus: parsed.ownershipStatus,
    fitNotes: parsed.fitNotes || null,
    acquisitionCostMinor: acquisitionCostMinor(parsed.acquisitionCost),
    acquisitionCurrency: parsed.acquisitionCurrency || null,
  };
}
