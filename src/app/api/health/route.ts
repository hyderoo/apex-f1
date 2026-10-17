import { NextResponse } from "next/server";
import { collectHealth } from "@/lib/health";

export const dynamic = "force-dynamic";

/** Data freshness / provider health monitor. Every value is a real check. */
export async function GET() {
  return NextResponse.json(await collectHealth());
}
