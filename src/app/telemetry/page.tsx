import { Suspense } from "react";
import { getCalendar } from "@/lib/f1/season";
import { getCurrentDrivers } from "@/lib/f1/drivers";
import { PageHeader } from "@/components/layout/page-header";
import { TelemetryExplorer } from "@/components/telemetry/telemetry-explorer";

export const metadata = { title: "Telemetry Lab" };
export const dynamic = "force-dynamic";

export default async function TelemetryPage() {
  const { meetings } = await getCalendar();
  const { drivers } = await getCurrentDrivers();
  const sessions = meetings
    .flatMap((m) => m.sessions.map((s) => ({ ...s, meetingName: m.name })))
    .filter((s) => s.status === "finished" || s.status === "live")
    .sort((a, b) => b.dateStart.localeCompare(a.dateStart));
  return (
    <div>
      <PageHeader
        eyebrow="Analysis"
        title="Telemetry Lab"
        description="Recorded car data joined onto lap distance derived from GPS traces. Brake is an on/off signal (not pressure); distances are documented approximations. Selections are encoded in the URL for sharing."
      />
      <Suspense>
        <TelemetryExplorer
          sessions={sessions.map((s) => ({
            sessionKey: s.sessionKey,
            label: `${s.location} — ${s.name}`,
            date: s.dateStart.slice(0, 10),
            type: s.type,
          }))}
          drivers={drivers.map((d) => ({
            driverNumber: d.driverNumber,
            acronym: d.acronym,
            teamColour: d.teamColour,
          }))}
        />
      </Suspense>
    </div>
  );
}
