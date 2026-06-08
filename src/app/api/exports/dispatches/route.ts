import { NextResponse } from "next/server";

import { getCurrentUserProfile } from "@/lib/auth";
import { getDispatches } from "@/lib/data/app-data";
import { buildWorkbookBuffer } from "@/lib/excel";

export async function GET() {
  const profile = await getCurrentUserProfile();
  if (!profile) {
    return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"));
  }

  const rows = await getDispatches(profile);
  const workbook = await buildWorkbookBuffer(
    rows.map((row) => ({
      dispatch_number: row.dispatch_number,
      request_number: row.request_number,
      client_name: row.client_name,
      from_branch: row.dispatch_from_branch_name ?? row.branch_name,
      to_branch: row.dispatch_to_branch_name ?? row.destination_name ?? "",
      dispatch_type: row.dispatch_type ?? "",
      person_name: row.person_name ?? "",
      bus_name: row.bus_name ?? "",
      bus_number: row.bus_number ?? "",
      courier_company_name: row.courier_company_name ?? row.courier_name ?? "",
      tracking_number: row.tracking_number ?? "",
      lr_number: row.lr_number ?? "",
      contact_number: row.contact_number ?? "",
      remarks: row.remarks ?? "",
      status: row.status,
      received_confirmation: row.received_confirmation ? "Yes" : "No",
      received_by: row.received_by ?? "",
      received_date: row.received_date ?? "",
    })),
    "Dispatches",
  );

  return new NextResponse(workbook, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="dispatch-report.xlsx"',
    },
  });
}
