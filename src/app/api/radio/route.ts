import { NextRequest, NextResponse } from "next/server";
import { openF1 } from "@/lib/providers";

export const dynamic = "force-dynamic";

/**
 * Team radio clips for one session. Historical data from OpenF1; audio stays
 * hotlinked to the provider-supplied livetiming URLs. No demo fallback:
 * a provider failure surfaces as UNAVAILABLE rather than borrowed data.
 */
export async function GET(req: NextRequest) {
  const sessionKey = Number(req.nextUrl.searchParams.get("session"));
  if (!sessionKey) return NextResponse.json({ error: "session is required" }, { status: 400 });
  try {
    const [drivers, radio] = await Promise.all([
      openF1.drivers({ sessionKey }),
      openF1.teamRadio({ sessionKey }),
    ]);
    return NextResponse.json({
      drivers: drivers.data ?? [],
      clips: radio.data ?? [],
      provenance: radio.provenance,
    });
  } catch (err) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : "provider error",
      drivers: [],
      clips: [],
      provenance: {
        provider: "OpenF1", status: "unavailable", observedAt: null,
        retrievedAt: new Date().toISOString(), staleAfterMs: 0,
      },
    }, { status: 502 });
  }
}
