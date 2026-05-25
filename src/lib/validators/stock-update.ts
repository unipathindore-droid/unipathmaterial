import { z } from "zod";

export const monthlyStockUpdateSchema = z.object({
  id: z.string().optional(),
  branch_id: z.string().min(1, "Branch is required."),
  material_id: z.string().min(1, "Material is required."),
  month: z.string().min(1, "Month is required."),
  opening_stock: z.coerce.number().min(0, "Opening stock cannot be negative."),
  received_stock: z.coerce.number().min(0, "Received stock cannot be negative."),
  used_stock: z.coerce.number().min(0, "Used stock cannot be negative."),
  damaged_stock: z.coerce.number().min(0, "Damaged stock cannot be negative."),
  remarks: z.string().max(300, "Remarks are too long.").optional().or(z.literal("")),
});

export type MonthlyStockUpdateFormValues = z.infer<typeof monthlyStockUpdateSchema>;
