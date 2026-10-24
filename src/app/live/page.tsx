import { Suspense } from "react";
import { getCalendar, sessionsByStatus } from "@/lib/f1/season";
import { PageHeader } from "@/components/layout/page-header";
import { LiveClient } from "@/components/timing/live-client";

export const metadata = { title: "Live Timing" };
export const dynamic = "force-dynamic";

export default async function LivePage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>;
}) {
  const { session } = await searchParams;
  const { meetings, provenance } = await getCalendar();
  const sessions = meetings.flatMap((m) =>
    m.sessions.map((s) => ({ ...s, meetingName: m.name })),
  );
  const { live, finished } = sessionsByStatus(sessions);
  const selected = session
    ? sessions.find((s) => s.sessionKey === Number(session))
    : (live[0] ?? finished[0]);
  return (
    <div>
      <PageHeader
        eyebrow="Timing"
        title={selected ? `${selected.location} — ${selected.name}` : "Live Timing"}
        description="Real provider timing. Positions come from the timing feed, never inferred from telemetry. Without a live OpenF1 subscription, in-progress data is marked DELAYED."
        status={provenance.status}
      />
      <Suspense>
        <LiveClient
          sessions={sessions
            .filter((s) => s.status === "finished" || s.status === "live")
            .sort((a, b) => b.dateStart.localeCompare(a.dateStart))
            .slice(0, 40)
            .map((s) => ({
              sessionKey: s.sessionKey,
              label: `${s.location} — ${s.name} (${s.dateStart.slice(0, 10)})`,
              status: s.status,
            }))}
          selectedKey={selected?.sessionKey ?? null}
        />
      </Suspense>
    </div>
  );
}
