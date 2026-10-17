import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServiceRole } from "@/lib/supabase/server";
import { LEAD_MINUTES_OPTIONS, SESSION_KINDS } from "@/lib/f1/push-dispatch";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const bodySchema = z.object({
  endpoint: z.string().url().max(2000),
  keys: z.object({ p256dh: z.string().min(1).max(512), auth: z.string().min(1).max(512) }),
  timezone: z.string().min(1).max(64),
  sessionKinds: z.array(z.enum(SESSION_KINDS as [string, ...string[]])).min(1),
  leadMinutes: z.number().int().refine((n) => (LEAD_MINUTES_OPTIONS as readonly number[]).includes(n)),
  circuitKeys: z.array(z.number().int()).max(30),
});

/** Create or replace a push subscription (keyed by endpoint). */
export async function POST(req: NextRequest) {
  const sb = getSupabaseServiceRole();
  if (!sb) {
    return NextResponse.json(
      { error: "supabase not configured", detail: "Push subscriptions need SUPABASE_SERVICE_ROLE_KEY and migration 0002." },
      { status: 503 },
    );
  }
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid body", detail: parsed.error.issues }, { status: 400 });
  }
  const b = parsed.data;
  const { error } = await sb.from("push_subscriptions").upsert(
    {
      endpoint: b.endpoint,
      p256dh: b.keys.p256dh,
      auth: b.keys.auth,
      timezone: b.timezone,
      session_kinds: b.sessionKinds,
      lead_minutes: b.leadMinutes,
      circuit_keys: b.circuitKeys,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "endpoint" },
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

/** Remove a subscription. The endpoint is the (unguessable) bearer key. */
export async function DELETE(req: NextRequest) {
  const sb = getSupabaseServiceRole();
  if (!sb) return NextResponse.json({ error: "supabase not configured" }, { status: 503 });
  const parsed = z.object({ endpoint: z.string().url().max(2000) })
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid body" }, { status: 400 });
  const { error } = await sb.from("push_subscriptions").delete().eq("endpoint", parsed.data.endpoint);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
