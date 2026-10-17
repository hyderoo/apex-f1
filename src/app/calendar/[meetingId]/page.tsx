import Link from "next/link";
import { notFound } from "next/navigation";
import { getCalendar, meetingStatus } from "@/lib/f1/season";
import { formatInTimeZone, formatLocalTime } from "@/lib/utils/time";
import { PageHeader } from "@/components/layout/page-header";
import { Badge, DataStatusBadge } from "@/components/ui/badge";
import { sessionStatusLabel } from "@/lib/f1/labels";
import { MeetingDetailClient } from "@/components/circuits/meeting-detail-client";

export const dynamic = "force-dynamic";

export default async function MeetingPage({
  params,
}: {
  params: Promise<{ meetingId: string }>;
}) {
  const { meetingId } = await params;
  const key = Number(meetingId);
  const { meetings, provenance } = await getCalendar();
  const meeting = meetings.find((m) => m.meetingKey === key);
  if (!meeting) notFound();
  const status = meetingStatus(meeting);
  return (
    <div>
      <PageHeader
        eyebrow={`${meeting.year} · ${meeting.countryName}`}
        title={meeting.name}
        description={meeting.officialName || `${meeting.circuitShortName}, ${meeting.location}`}
        status={provenance.status}
      />
      <div className="grid grid-cols-1 gap-px bg-[var(--line)] lg:grid-cols-3">
        <section className="panel lg:col-span-2">
          <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-2.5">
            <span className="micro-label">Sessions</span>
            {status === "live" && <DataStatusBadge status="live" />}
          </div>
          <MeetingDetailClient meeting={meeting} />
        </section>
        <section className="panel">
          <div className="border-b border-[var(--line)] px-4 py-2.5">
            <span className="micro-label">Circuit</span>
          </div>
          <div className="p-4">
            <div className="text-base font-semibold">{meeting.circuitShortName}</div>
            <div className="mt-0.5 text-xs text-[var(--ink-3)]">
              {meeting.location}, {meeting.countryName}
              {meeting.circuitType ? ` · ${meeting.circuitType} circuit` : ""}
            </div>
            <div className="mt-2 flex gap-2">
              <Badge>{meeting.gmtOffset}</Badge>
              <Badge tone={status === "live" ? "accent" : "neutral"}>{sessionStatusLabel(status)}</Badge>
            </div>
            <Link
              href={`/api/ics?meeting=${meeting.meetingKey}`}
              className="mt-4 inline-block border border-[var(--line-2)] px-3 py-1.5 text-xs hover:bg-[var(--surface-3)]"
            >
              Download ICS (all sessions)
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
