import { getCalendar } from "@/lib/f1/season";
import { PageHeader } from "@/components/layout/page-header";
import { FlagImage } from "@/components/identity/country-flag";
import { CircuitImage } from "@/components/identity/circuit-image";

export const metadata = { title: "Circuits" };
export const dynamic = "force-dynamic";

export default async function CircuitsPage() {
  const { meetings, provenance } = await getCalendar();
  const seen = new Map<number, (typeof meetings)[number]>();
  for (const m of meetings) if (!seen.has(m.circuitKey)) seen.set(m.circuitKey, m);
  const circuits = [...seen.values()];
  return (
    <div>
      <PageHeader
        eyebrow="2026 Season"
        title="Circuits"
        description="Every circuit on the 2026 calendar. Interactive circuit maps with recorded geometry live in the Telemetry Lab."
        status={provenance.status}
      />
      <div className="grid grid-cols-1 gap-px bg-[var(--line)] sm:grid-cols-2 xl:grid-cols-3">
        {circuits.map((m) => (
          <a key={m.circuitKey} href={`/calendar/${m.meetingKey}`} className="panel p-4 hover:bg-[var(--surface-3)]">
            <div className="mb-2 flex items-start justify-between gap-2">
              <FlagImage src={m.countryFlagUrl} label={m.countryName} size={16} />
              <CircuitImage src={m.circuitImageUrl} label={m.circuitShortName} width={64} height={48} className="h-12 w-16" />
            </div>
            <div className="text-base font-semibold">{m.circuitShortName}</div>
            <div className="mt-0.5 text-xs text-[var(--ink-3)]">
              {m.location}, {m.countryName}
            </div>
            <div className="mt-2 text-[11px] text-[var(--ink-3)]">
              {m.circuitType ?? "Circuit"} · GMT{m.gmtOffset.replace(/:\d{2}$/, "")}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
