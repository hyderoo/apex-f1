import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { getServerEnv, publicEnv } from "@/lib/env";
import { getSupabaseServiceRole } from "@/lib/supabase/server";
import {
  renderNotification,
  selectDueNotifications,
  sentKey,
  type DispatchSession,
  type PushSubscriptionRow,
  type SessionKind,
} from "@/lib/f1/push-dispatch";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Sends due session notifications. Triggered every 15 minutes by the
 * push-dispatch GitHub Actions workflow (Vercel Hobby cron is daily-only,
 * too coarse for pre-session alerts). Protected by CRON_SECRET, same as
 * /api/cron/sync. Reads the schedule from Supabase (kept fresh by the sync
 * cron) so no provider quota is spent here.
 */
export async function GET(req: NextRequest) {
  const { CRON_SECRET, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = getServerEnv();
  const auth = req.headers.get("authorization");
  if (!CRON_SECRET || auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const publicKey = publicEnv.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!publicKey || !VAPID_PRIVATE_KEY) {
    return NextResponse.json(
      { error: "push not configured", detail: "Set NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY." },
      { status: 503 },
    );
  }
  const sb = getSupabaseServiceRole();
  if (!sb) return NextResponse.json({ error: "supabase not configured" }, { status: 503 });

  const now = new Date();
  const from = new Date(now.getTime() - 10 * 60000).toISOString();
  const to = new Date(now.getTime() + 2 * 3600 * 1000).toISOString();

  const [subsRes, sessRes] = await Promise.all([
    sb.from("push_subscriptions").select("id, endpoint, p256dh, auth, timezone, session_kinds, lead_minutes, circuit_keys"),
    sb.from("sessions")
      .select("session_key, meeting_key, name, circuit_key, date_start, meetings(name, location)")
      .gt("date_start", from).lt("date_start", to).eq("is_cancelled", false),
  ]);
  if (subsRes.error) return NextResponse.json({ error: subsRes.error.message }, { status: 500 });
  if (sessRes.error) return NextResponse.json({ error: sessRes.error.message }, { status: 500 });

  const subscriptions: PushSubscriptionRow[] = (subsRes.data ?? []).map((r) => ({
    id: r.id, endpoint: r.endpoint, p256dh: r.p256dh, auth: r.auth,
    timezone: r.timezone, sessionKinds: r.session_kinds as SessionKind[],
    leadMinutes: r.lead_minutes, circuitKeys: r.circuit_keys ?? [],
  }));
  const sessions: DispatchSession[] = (sessRes.data ?? []).map((r) => {
    const m = Array.isArray(r.meetings) ? r.meetings[0] : r.meetings;
    return {
      sessionKey: r.session_key, meetingKey: r.meeting_key, name: r.name,
      circuitKey: r.circuit_key, dateStart: r.date_start,
      meetingName: m?.name ?? "", location: m?.location ?? "",
    };
  });

  if (subscriptions.length === 0 || sessions.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, failed: 0, removed: 0, subscriptions: subscriptions.length, candidates: sessions.length });
  }

  const keys = sessions.map((s) => s.sessionKey);
  const { data: logRows, error: logErr } = await sb.from("push_log")
    .select("subscription_id, session_key").in("session_key", keys);
  if (logErr) return NextResponse.json({ error: logErr.message }, { status: 500 });
  const sent = new Set((logRows ?? []).map((r) => sentKey(r.subscription_id, r.session_key)));

  const due = selectDueNotifications(subscriptions, sessions, sent, now);
  webpush.setVapidDetails(
    VAPID_SUBJECT || publicEnv.NEXT_PUBLIC_SITE_URL || "https://apex-f1-murex.vercel.app",
    publicKey, VAPID_PRIVATE_KEY,
  );

  let sentCount = 0, failed = 0, removed = 0;
  const logInserts: { subscription_id: string; session_key: number }[] = [];
  for (const d of due) {
    const payload = renderNotification(d);
    try {
      await webpush.sendNotification(
        { endpoint: d.subscription.endpoint, keys: { p256dh: d.subscription.p256dh, auth: d.subscription.auth } },
        JSON.stringify(payload),
        { TTL: 3600 },
      );
      sentCount += 1;
      logInserts.push({ subscription_id: d.subscription.id, session_key: d.session.sessionKey });
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        // Endpoint is dead (browser revoked it) — remove so we stop trying.
        await sb.from("push_subscriptions").delete().eq("id", d.subscription.id);
        removed += 1;
      } else {
        failed += 1;
      }
    }
  }
  if (logInserts.length > 0) {
    await sb.from("push_log").upsert(logInserts, { onConflict: "subscription_id,session_key" });
  }
  return NextResponse.json({ ok: true, sent: sentCount, failed, removed, due: due.length, subscriptions: subscriptions.length, candidates: sessions.length });
}
