import { z } from "zod";

export const materialSchema = z.object({
  sku: z.string().min(2, "SKU is required.").max(40, "SKU is too long."),
  name: z.string().min(2, "Material name is required.").max(160, "Material name is too long."),
  category: z.string().min(2, "Category is required.").max(80, "Category is too long."),
  unit_of_measure: z
    .string()
    .min(1, "Unit of measure is required.")
    .max(30, "Unit of measure is too long."),
  expiry_required: z.boolean(),
  min_threshold: z.coerce
    .number()
    .min(0, "Minimum threshold cannot be negative.")
    .max(1000000, "Minimum threshold is too large."),
  active: z.boolean(),
});

export type MaterialFormValues = z.infer<typeof materialSchema>;
