import { NextResponse } from "next/server";

import { getCurrentUserProfile } from "@/lib/auth";
import { getMaterialStockRows } from "@/lib/data/app-data";
import { buildWorkbookBuffer } from "@/lib/excel";

export async function GET() {
  const profile = await getCurrentUserProfile();
  if (!profile) {
    return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"));
  }

  const rows = await getMaterialStockRows(profile);
  const workbook = buildWorkbookBuffer(
    rows.map((row) => ({
      branch_name: row.branch_name ?? "",
      material_name: row.material_name,
      material_code: row.material_code ?? "",
      opening_stock: row.opening_stock ?? 0,
      current_stock: row.available_quantity,
      minimum_stock_alert_level: row.reorder_level,
      status: row.status ?? "",
      nearest_expiry_date: row.nearest_expiry_date ?? "",
    })),
    "Materials",
  );

  return new NextResponse(workbook, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="material-stock-report.xlsx"',
    },
  });
}
