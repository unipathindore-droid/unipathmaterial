import { describe, expect, it } from "vitest";

import { requestSchema } from "./request";

describe("requestSchema", () => {
  it("accepts a valid request with multiple unique materials", () => {
    const result = requestSchema.safeParse({
      client_id: "client-1",
      required_by: "2026-04-10",
      notes: "Urgent branch replenishment",
      items: [
        { material_id: "mat-1", requested_qty: 10, remarks: "" },
        { material_id: "mat-2", requested_qty: 5, remarks: "priority" },
      ],
    });

    expect(result.success).toBe(true);
  });

  it("rejects duplicate materials in one request", () => {
    const result = requestSchema.safeParse({
      client_id: "client-1",
      required_by: "",
      notes: "",
      items: [
        { material_id: "mat-1", requested_qty: 10, remarks: "" },
        { material_id: "mat-1", requested_qty: 5, remarks: "" },
      ],
    });

    expect(result.success).toBe(false);
  });
});
