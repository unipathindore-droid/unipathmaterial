import { NextResponse } from "next/server";

import { isInsForgeConfigured } from "@/lib/env";

export function GET() {
  const insforgeConfigured = isInsForgeConfigured();
  const status = insforgeConfigured ? 200 : 503;

  return NextResponse.json(
    {
      ok: insforgeConfigured,
      checks: {
        insforgeConfigured,
      },
      timestamp: new Date().toISOString(),
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
