import { NextRequest, NextResponse } from "next/server";
import { resolveSession } from "@/lib/f1/session-data";
import { withDemoFallback } from "@/lib/providers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("session");
  const session = await resolveSession(key ? Number(key) : null);
  if (!session) return NextResponse.json({ error: "no session found" }, { status: 404 });
  const { envelope } = await withDemoFallback((p) => p.raceControl({ sessionKey: session.sessionKey }));
  const data = (envelope.data ?? []).sort((a, b) => b.date.localeCompare(a.date));
  return NextResponse.json({ session, data, provenance: envelope.provenance });
}
