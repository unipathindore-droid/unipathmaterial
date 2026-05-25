import { z } from "zod";

export const branchSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "Branch name is required.").max(120, "Branch name is too long."),
  code: z.string().min(2, "Branch code is required.").max(20, "Branch code is too long."),
  address: z.string().max(300, "Address is too long.").optional().or(z.literal("")),
  city: z.string().min(2, "City is required.").max(80, "City is too long."),
  state: z.string().max(80, "State is too long.").optional().or(z.literal("")),
  pincode: z.string().max(20, "Pincode is too long.").optional().or(z.literal("")),
  contact_person: z.string().max(120, "Contact person is too long.").optional().or(z.literal("")),
  contact_number: z.string().max(20, "Contact number is too long.").optional().or(z.literal("")),
  status: z.enum(["active", "inactive"]),
});

export type BranchFormValues = z.infer<typeof branchSchema>;
