import { z } from "zod";

export const clientSchema = z.object({
  id: z.string().optional(),
  branch_id: z.string().min(1, "Branch is required."),
  client_code: z.string().min(2, "Client code is required.").max(30, "Client code is too long."),
  name: z.string().min(2, "Client name is required.").max(120, "Client name is too long."),
  email: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((value) => !value || z.string().email().safeParse(value).success, {
      message: "Enter a valid email address.",
    }),
  phone: z.string().max(20, "Phone number is too long.").optional().or(z.literal("")),
  contact_person: z
    .string()
    .max(120, "Contact person is too long.")
    .optional()
    .or(z.literal("")),
  city: z.string().max(80, "City is too long.").optional().or(z.literal("")),
  address: z.string().max(300, "Address is too long.").optional().or(z.literal("")),
  status: z.enum(["active", "inactive"]),
});

export type ClientFormValues = z.infer<typeof clientSchema>;
