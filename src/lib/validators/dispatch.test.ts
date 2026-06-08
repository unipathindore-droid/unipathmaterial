import { describe, expect, it } from "vitest";

import { dispatchSchema } from "./dispatch";

describe("dispatchSchema", () => {
  it("accepts dispatch items when expiry is provided for expiry-controlled materials", () => {
    const result = dispatchSchema.safeParse({
      request_id: "req-1",
      dispatch_date: "2026-04-01",
      dispatch_from_branch_id: "branch-1",
      dispatch_type: "courier",
      courier_name: "BlueDart",
      tracking_number: "BD123",
      dispatch_status: "dispatched",
      received_confirmation: false,
      eta_date: "2026-04-05",
      items: [
        {
          request_item_id: "item-1",
          material_id: "mat-1",
          branch_inventory_id: "inventory-1",
          material_name: "EDTA Tubes",
          expiry_required: true,
          quantity: 12,
          batch_number: "LOT-1",
          expiry_date: "2026-08-20",
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it("rejects expiry-controlled materials without expiry_date", () => {
    const result = dispatchSchema.safeParse({
      request_id: "req-1",
      dispatch_date: "2026-04-01",
      dispatch_from_branch_id: "branch-1",
      dispatch_type: "courier",
      courier_name: "BlueDart",
      tracking_number: "BD123",
      dispatch_status: "dispatched",
      received_confirmation: false,
      eta_date: "2026-04-05",
      items: [
        {
          request_item_id: "item-1",
          material_id: "mat-1",
          branch_inventory_id: "inventory-1",
          material_name: "EDTA Tubes",
          expiry_required: true,
          quantity: 12,
          batch_number: "LOT-1",
          expiry_date: "",
        },
      ],
    });

    expect(result.success).toBe(false);
  });
});
