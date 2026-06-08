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
    dispatch_date: z.string().min(1, "Dispatch date is required."),
    dispatch_from_branch_id: z.string().min(1, "Dispatch from branch is required."),
    dispatch_to_branch_id: z.string().optional().or(z.literal("")),
    destination_name: z.string().max(160, "Destination name is too long.").optional().or(z.literal("")),
    dispatch_type: z.enum(["person", "bus", "courier"]),
    person_name: z.string().max(120, "Person name is too long.").optional().or(z.literal("")),
    bus_name: z.string().max(120, "Bus name is too long.").optional().or(z.literal("")),
    bus_number: z.string().max(60, "Bus number is too long.").optional().or(z.literal("")),
    courier_name: z.string().max(80, "Courier name is too long.").optional().or(z.literal("")),
    lr_number: z.string().max(120, "LR number is too long.").optional().or(z.literal("")),
    tracking_number: z.string().max(120, "Tracking number is too long.").optional().or(z.literal("")),
    contact_number: z.string().max(20, "Contact number is too long.").optional().or(z.literal("")),
    remarks: z.string().max(300, "Remarks are too long.").optional().or(z.literal("")),
    dispatch_status: z.enum(["queued", "packed", "dispatched", "delivered", "cancelled"]),
    received_confirmation: z.boolean(),
    received_by: z.string().max(120, "Received by is too long.").optional().or(z.literal("")),
    received_date: z.string().optional().or(z.literal("")),
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

    if (value.dispatch_type === "person" && !value.person_name) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Person name is required for By Person dispatch.",
        path: ["person_name"],
      });
    }

    if (value.dispatch_type === "bus" && !value.bus_name && !value.bus_number) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Bus name or bus number is required for By Bus dispatch.",
        path: ["bus_name"],
      });
    }

    if (value.dispatch_type === "courier" && !value.courier_name) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Courier company name is required for courier dispatch.",
        path: ["courier_name"],
      });
    }

    if (value.received_confirmation && !value.received_by) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Received by is required once confirmation is marked.",
        path: ["received_by"],
      });
    }
  });

export type DispatchFormValues = z.infer<typeof dispatchSchema>;
