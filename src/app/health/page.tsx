import { PageHeader } from "@/components/layout/page-header";
import { collectHealth } from "@/lib/health";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Data Health" };
export const dynamic = "force-dynamic";

type Health = {
  now: string;
  config: {
    openF1LiveKey: boolean; supabase: boolean; supabaseServiceRole: boolean;
    cronSecret: boolean; siteUrl: string | null;
  };
  deploy: { commitSha: string | null; commitRef: string | null; platform: string };
  providers: {
    openf1?: { ok: boolean; responseMs?: number; status?: string; provider?: string; retrievedAt?: string; meetings?: number; error?: string };
    jolpica?: { ok: boolean; responseMs?: number; standings?: number; error?: string };
    sessions?: { count: number };
    telemetryProbe?: { ok: boolean; httpStatus?: number; responseMs?: number; samples?: number; rateLimited?: boolean; error?: string };
  };
};

async function getHealth(): Promise<Health | null> {
  try {
    return (await collectHealth()) as Health;
  } catch {
    return null;
  }
}

function Row({ k, v, mono = true }: { k: string; v: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--line)] px-3 py-2 last:border-0">
      <span className="text-xs text-[var(--ink-3)]">{k}</span>
      <span className={mono ? "font-mono text-xs tnum" : "text-xs"}>{v}</span>
    </div>
  );
}

export default async function HealthPage() {
  const h = await getHealth();
  if (!h) {
    return (
      <div>
        <PageHeader eyebrow="System" title="Data Health" status="unavailable" />
        <div className="p-6 text-sm text-[var(--ink-3)]">Health endpoint unreachable.</div>
      </div>
    );
  }
  const p = h.providers;
  return (
    <div>
      <PageHeader
        eyebrow="System"
        title="Data Health"
        description="Live checks against every provider this app depends on. Nothing here is assumed — each row is a real request, made now."
        status={p.openf1?.ok ? "historical" : "unavailable"}
        updatedAt={h.now}
      />
      <div className="grid grid-cols-1 gap-px bg-[var(--line)] lg:grid-cols-2">
        <section className="panel">
          <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-2.5">
            <span className="micro-label">OpenF1 — timing, telemetry, weather, race control</span>
            {p.openf1?.ok ? <Badge tone="accent">Reachable</Badge> : <Badge tone="pb">Error</Badge>}
          </div>
          <Row k="Meetings probe" v={p.openf1?.ok ? `OK · ${p.openf1.responseMs}ms · ${p.openf1.meetings} meetings` : p.openf1?.error ?? "failed"} />
          <Row k="Telemetry probe (recorded lap window)" v={
            p.telemetryProbe
              ? p.telemetryProbe.ok
                ? `OK · ${p.telemetryProbe.responseMs}ms · ${p.telemetryProbe.samples} samples`
                : `HTTP ${p.telemetryProbe.httpStatus ?? "—"}${p.telemetryProbe.rateLimited ? " · rate limited" : ""}${p.telemetryProbe.error ? ` · ${p.telemetryProbe.error}` : ""}`
              : "—"
          } />
          <Row k="Live subscription key" v={h.config.openF1LiveKey ? "configured" : "not set — in-progress sessions label DELAYED"} mono={false} />
          <Row k="Sessions indexed" v={p.sessions?.count ?? "—"} />
        </section>

        <section className="panel">
          <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-2.5">
            <span className="micro-label">Jolpica — schedule, results, standings</span>
            {p.jolpica?.ok ? <Badge tone="accent">Reachable</Badge> : <Badge tone="pb">Error</Badge>}
          </div>
          <Row k="Standings probe" v={p.jolpica?.ok ? `OK · ${p.jolpica.responseMs}ms · ${p.jolpica.standings} drivers` : p.jolpica?.error ?? "failed"} />
        </section>

        <section className="panel">
          <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-2.5">
            <span className="micro-label">Supabase — accounts &amp; favorites sync</span>
            {h.config.supabase ? <Badge tone="accent">Configured</Badge> : <Badge>Off</Badge>}
          </div>
          <Row k="Public URL + publishable key" v={h.config.supabase ? "configured" : "not set"} />
          <Row k="Service role key" v={h.config.supabaseServiceRole ? "configured" : "not set"} />
          {!h.config.supabase && (
            <div className="px-3 py-2 text-[11px] leading-snug text-[var(--ink-3)]">
              Accounts and cloud favorites sync are disabled on this deployment; preferences stay in the browser. Nothing else depends on Supabase.
            </div>
          )}
        </section>

        <section className="panel">
          <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-2.5">
            <span className="micro-label">Deployment</span>
          </div>
          <Row k="Platform" v={h.deploy.platform} />
          <Row k="Commit" v={h.deploy.commitSha ? `${h.deploy.commitSha.slice(0, 7)}${h.deploy.commitRef ? ` (${h.deploy.commitRef})` : ""}` : "local"} />
          <Row k="Cron secret (daily cache warm)" v={h.config.cronSecret ? "configured" : "not set"} />
          <Row k="Site URL" v={h.config.siteUrl ?? "not set"} />
        </section>

        <section className="panel lg:col-span-2">
          <div className="border-b border-[var(--line)] px-4 py-2.5">
            <span className="micro-label">What the labels mean</span>
          </div>
          <div className="grid grid-cols-1 gap-2 p-4 text-xs leading-relaxed text-[var(--ink-3)] md:grid-cols-3">
            <p><span className="font-semibold text-[var(--ink-2)]">LIVE</span> — streaming from a paid OpenF1 subscription. Requires OPENF1_API_KEY.</p>
            <p><span className="font-semibold text-[var(--ink-2)]">DELAYED</span> — session in progress, free-tier data arrives with a delay.</p>
            <p><span className="font-semibold text-[var(--ink-2)]">HISTORICAL</span> — recorded data from a finished session. Telemetry and GPS are immutable once recorded.</p>
            <p><span className="font-semibold text-[var(--ink-2)]">DEMO DATA</span> — bundled real snapshot (2026 Singapore GP), used only when the provider is unreachable and only ever for that session.</p>
            <p><span className="font-semibold text-[var(--ink-2)]">UNAVAILABLE</span> — provider failed (often rate limiting on shared hosts). The app says so instead of faking data.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
