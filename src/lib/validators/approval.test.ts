import { describe, expect, it } from "vitest";

import { approvalSchema } from "./approval";

describe("approvalSchema", () => {
  it("allows approval without a reason", () => {
    const result = approvalSchema.safeParse({
      decision: "approved",
      reason: "",
    });

    expect(result.success).toBe(true);
  });

  it("requires a reason for partial approval", () => {
    const result = approvalSchema.safeParse({
      decision: "partially_approved",
      reason: "",
    });

    expect(result.success).toBe(false);
  });

  it("requires a reason for rejection", () => {
    const result = approvalSchema.safeParse({
      decision: "rejected",
      reason: "",
    });

    expect(result.success).toBe(false);
  });
});
