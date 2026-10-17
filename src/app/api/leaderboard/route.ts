import { NextRequest, NextResponse } from "next/server";
import { resolveSession, getLeaderboard } from "@/lib/f1/session-data";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("session");
  const session = await resolveSession(key ? Number(key) : null);
  if (!session) {
    return NextResponse.json({ error: "no session found" }, { status: 404 });
  }
  try {
    const env = await getLeaderboard(session);
    return NextResponse.json(
      { session, ...env },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    return NextResponse.json(
      { error: "leaderboard unavailable", detail: err instanceof Error ? err.message : "" },
      { status: 502 },
    );
  }
}
