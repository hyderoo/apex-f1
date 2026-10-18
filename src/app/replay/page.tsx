import { Suspense } from "react";
import { getCalendar } from "@/lib/f1/season";
import { PageHeader } from "@/components/layout/page-header";
import { ReplayClient } from "@/components/replay/replay-client";

export const metadata = { title: "Race Replay" };
export const dynamic = "force-dynamic";

export default async function ReplayPage() {
  const { meetings } = await getCalendar();
  const races = meetings
    .flatMap((m) => m.sessions)
    .filter((s) => s.type === "Race" && s.status === "finished")
    .sort((a, b) => b.dateStart.localeCompare(a.dateStart));
  return (
    <div>
      <PageHeader
        eyebrow="Analysis"
        title="Race Replay"
        description="Recorded car positions replayed on the track map. Downsampled from OpenF1 location data and interpolated between samples — a replay of what was recorded, not a simulation."
      />
      <Suspense>
        <ReplayClient
          races={races.map((s) => ({
            sessionKey: s.sessionKey,
            label: `${s.location} — ${s.name} (${s.dateStart.slice(0, 10)})`,
          }))}
        />
      </Suspense>
    </div>
  );
}
