import { z } from "zod";

export const approvalSchema = z
  .object({
    decision: z.enum(["approved", "rejected", "partially_approved"]),
    reason: z.string().max(300, "Reason is too long.").optional().or(z.literal("")),
  })
  .superRefine((value, ctx) => {
    if (
      (value.decision === "rejected" || value.decision === "partially_approved") &&
      !value.reason?.trim()
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Reason is required for reject and partial approval decisions.",
        path: ["reason"],
      });
    }
  });

export type ApprovalFormValues = z.infer<typeof approvalSchema>;
