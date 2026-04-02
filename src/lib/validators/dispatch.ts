import { z } from "zod";

export const dispatchItemSchema = z.object({
  request_item_id: z.string().min(1, "Request item is required."),
  material_id: z.string().min(1, "Material is required."),
  branch_inventory_id: z.string().min(1, "Branch inventory record is required."),
  material_name: z.string().min(1, "Material name is required."),
  expiry_required: z.boolean(),
  quantity: z.coerce.number().positive("Dispatch quantity must be greater than zero."),
  batch_number: z.string().max(80, "Batch number is too long.").optional().or(z.literal("")),
  expiry_date: z.string().optional().or(z.literal("")),
});

export const dispatchSchema = z
  .object({
    request_id: z.string().min(1, "Approved request is required."),
    courier_name: z.string().max(80, "Courier name is too long.").optional().or(z.literal("")),
    tracking_number: z.string().max(120, "Tracking number is too long.").optional().or(z.literal("")),
    eta_date: z.string().optional().or(z.literal("")),
    items: z.array(dispatchItemSchema).min(1, "At least one dispatch item is required."),
  })
  .superRefine((value, ctx) => {
    value.items.forEach((item, index) => {
      if (item.expiry_required && !item.expiry_date) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Expiry date is required for this material.",
          path: ["items", index, "expiry_date"],
        });
      }
    });
  });

export type DispatchFormValues = z.infer<typeof dispatchSchema>;
