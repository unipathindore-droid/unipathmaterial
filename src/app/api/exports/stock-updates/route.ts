import { NextResponse } from "next/server";

import { getCurrentUserProfile } from "@/lib/auth";
import { getMonthlyStockUpdates } from "@/lib/data/app-data";
import { buildWorkbookBuffer } from "@/lib/excel";

export async function GET() {
  const profile = await getCurrentUserProfile();
  if (!profile) {
    return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"));
  }

  const rows = await getMonthlyStockUpdates(profile);
  const workbook = buildWorkbookBuffer(
    rows.map((row) => ({
      branch_name: row.branch_name ?? "",
      material_name: row.material_name ?? "",
      material_code: row.material_code ?? "",
      month: row.month,
      opening_stock: row.opening_stock,
      received_stock: row.received_stock,
      used_stock: row.used_stock,
      damaged_stock: row.damaged_stock,
      closing_stock: row.closing_stock,
      remarks: row.remarks ?? "",
    })),
    "MonthlyStock",
  );

  return new NextResponse(workbook, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="monthly-stock-report.xlsx"',
    },
  });
}
