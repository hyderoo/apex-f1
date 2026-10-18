import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { z } from "zod";
import { getServerEnv, publicEnv } from "@/lib/env";
import { getSupabaseServiceRole } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Sends one test notification to the caller's OWN subscription so the
 * enable-flow can be verified end-to-end without waiting for a session.
 * Safe by design: the browser's subscription endpoint is a bearer secret —
 * a caller can only target subscriptions it already holds, and only rows
 * that exist in push_subscriptions are used (keys come from our table,
 * never from the request).
 */
export async function POST(req: NextRequest) {
  const parsed = z.object({ endpoint: z.string().url().max(2000) })
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid body" }, { status: 400 });

  const { VAPID_PRIVATE_KEY, VAPID_SUBJECT } = getServerEnv();
  const publicKey = publicEnv.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!publicKey || !VAPID_PRIVATE_KEY) {
    return NextResponse.json({ error: "push not configured" }, { status: 503 });
  }
  const sb = getSupabaseServiceRole();
  if (!sb) return NextResponse.json({ error: "supabase not configured" }, { status: 503 });

  const { data: row, error } = await sb.from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("endpoint", parsed.data.endpoint)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!row) return NextResponse.json({ error: "subscription not found — enable notifications first" }, { status: 404 });

  webpush.setVapidDetails(
    VAPID_SUBJECT || publicEnv.NEXT_PUBLIC_SITE_URL || "https://apex-f1-murex.vercel.app",
    publicKey, VAPID_PRIVATE_KEY,
  );
  try {
    await webpush.sendNotification(
      { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
      JSON.stringify({
        title: "APEX F1 test notification",
        body: "Session notifications are working. You'll get one before the sessions you picked.",
        tag: "apex-test",
        url: "/settings",
      }),
      { TTL: 300 },
    );
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) {
      await sb.from("push_subscriptions").delete().eq("id", row.id);
      return NextResponse.json({ error: "subscription is dead (browser revoked it) and was removed — re-enable notifications" }, { status: 410 });
    }
    return NextResponse.json({ error: `push service rejected the send (HTTP ${status ?? "?"})` }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
