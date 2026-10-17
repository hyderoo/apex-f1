import { getCalendar, meetingStatus } from "@/lib/f1/season";
import { CalendarClient } from "@/components/circuits/calendar-client";
import { PageHeader } from "@/components/layout/page-header";

export const metadata = { title: "2026 Calendar" };
export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const { meetings, provenance } = await getCalendar();
  const rounds = meetings.filter((m) => m.name !== "Pre-Season Testing");
  const statusByMeeting = new Map(meetings.map((m) => [m.meetingKey, meetingStatus(m)]));
  return (
    <div>
      <PageHeader
        eyebrow="Season"
        title="2026 Calendar"
        description="Every Grand Prix weekend of the 2026 FIA Formula One World Championship, with all published sessions in track time and your time."
        status={provenance.status}
        updatedAt={provenance.retrievedAt}
      />
      <CalendarClient meetings={rounds} statusByMeeting={Object.fromEntries(statusByMeeting)} />
    </div>
  );
}
