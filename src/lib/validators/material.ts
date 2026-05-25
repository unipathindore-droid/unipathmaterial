import { z } from "zod";

export const materialSchema = z.object({
  id: z.string().optional(),
  sku: z.string().min(2, "SKU is required.").max(40, "SKU is too long."),
  material_code: z.string().min(2, "Material code is required.").max(40, "Material code is too long."),
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
  opening_stock: z.coerce
    .number()
    .min(0, "Opening stock cannot be negative.")
    .max(1000000, "Opening stock is too large."),
  current_stock: z.coerce
    .number()
    .min(0, "Current stock cannot be negative.")
    .max(1000000, "Current stock is too large."),
  branch_id: z.string().min(1, "Branch is required."),
  active: z.boolean(),
});

export type MaterialFormValues = z.infer<typeof materialSchema>;
