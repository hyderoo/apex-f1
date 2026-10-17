import { Suspense } from "react";
import { getCalendar } from "@/lib/f1/season";
import { PageHeader } from "@/components/layout/page-header";
import { StrategyClient } from "@/components/timing/strategy-client";

export const metadata = { title: "Tyre Strategy" };
export const dynamic = "force-dynamic";

export default async function StrategyPage() {
  const { meetings } = await getCalendar();
  const races = meetings
    .flatMap((m) => m.sessions)
    .filter((s) => s.type === "Race" && s.status === "finished")
    .sort((a, b) => b.dateStart.localeCompare(a.dateStart));
  return (
    <div>
      <PageHeader
        eyebrow="Analysis"
        title="Tyre Strategy & Pit Stops"
        description="Observed stints and pit stops from provider records. Anything estimated is labelled as such; tyre life is never inferred from compound alone."
      />
      <Suspense>
        <StrategyClient
          races={races.map((s) => ({
            sessionKey: s.sessionKey,
            label: `${s.location} — ${s.name} (${s.dateStart.slice(0, 10)})`,
          }))}
        />
      </Suspense>
    </div>
  );
}
