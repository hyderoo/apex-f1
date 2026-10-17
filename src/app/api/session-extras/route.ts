import { NextRequest, NextResponse } from "next/server";
import { resolveSession } from "@/lib/f1/session-data";
import { getSessionExtras } from "@/lib/f1/session-extras";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const key = Number(req.nextUrl.searchParams.get("session"));
  if (!key) return NextResponse.json({ error: "session required" }, { status: 400 });
  const session = await resolveSession(key);
  if (!session) return NextResponse.json({ error: "no session found" }, { status: 404 });
  try {
    const extras = await getSessionExtras(session);
    return NextResponse.json(
      { session, ...extras },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    return NextResponse.json(
      { error: "session extras unavailable", detail: err instanceof Error ? err.message : "" },
      { status: 502 },
    );
  }
}
