import { NextRequest, NextResponse } from "next/server";
import { resolveSession } from "@/lib/f1/session-data";
import { withDemoFallback } from "@/lib/providers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("session");
  const session = await resolveSession(key ? Number(key) : null);
  if (!session) return NextResponse.json({ error: "no session found" }, { status: 404 });
  const { envelope } = await withDemoFallback((p) => p.weather({ sessionKey: session.sessionKey }));
  const data = envelope.data ?? [];
  return NextResponse.json({
    session,
    latest: data[data.length - 1] ?? null,
    series: data,
    provenance: envelope.provenance,
  });
}
