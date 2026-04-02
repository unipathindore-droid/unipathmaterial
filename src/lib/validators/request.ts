import { z } from "zod";

export const requestItemSchema = z.object({
  material_id: z.string().min(1, "Select a material."),
  requested_qty: z.coerce
    .number()
    .positive("Quantity must be greater than zero.")
    .max(1000000, "Quantity is too large."),
  remarks: z.string().max(250, "Remarks are too long.").optional().or(z.literal("")),
});

export const requestSchema = z
  .object({
    client_id: z.string().min(1, "Client is required."),
    required_by: z.string().optional().or(z.literal("")),
    notes: z.string().max(500, "Notes are too long.").optional().or(z.literal("")),
    items: z.array(requestItemSchema).min(1, "Add at least one material."),
  })
  .superRefine((value, ctx) => {
    const ids = value.items.map((item) => item.material_id).filter(Boolean);
    const uniqueIds = new Set(ids);

    if (ids.length !== uniqueIds.size) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Each material can only be added once per request.",
        path: ["items"],
      });
    }
  });

export type RequestFormValues = z.infer<typeof requestSchema>;
