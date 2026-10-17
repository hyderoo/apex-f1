import { NextRequest, NextResponse } from "next/server";
import { getCalendar } from "@/lib/f1/season";

export const dynamic = "force-dynamic";

function icsDate(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escapeIcs(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export async function GET(req: NextRequest) {
  const meetingKey = req.nextUrl.searchParams.get("meeting");
  const sessionKey = req.nextUrl.searchParams.get("session");
  const { meetings } = await getCalendar();
  const sessions = meetings
    .flatMap((m) => m.sessions.map((s) => ({ ...s, meetingName: m.name })))
    .filter((s) => {
      if (sessionKey) return s.sessionKey === Number(sessionKey);
      if (meetingKey) return s.meetingKey === Number(meetingKey);
      return false;
    });
  if (sessions.length === 0) {
    return new NextResponse("not found", { status: 404 });
  }
  const now = icsDate(new Date().toISOString());
  const events = sessions
    .map(
      (s) => `BEGIN:VEVENT
UID:apex-f1-${s.sessionKey}@apex-f1
DTSTAMP:${now}
DTSTART:${icsDate(s.dateStart)}
DTEND:${icsDate(s.dateEnd || s.dateStart)}
SUMMARY:${escapeIcs(`F1 ${s.meetingName} — ${s.name}`)}
LOCATION:${escapeIcs(`${s.circuitShortName}, ${s.location}, ${s.countryName}`)}
END:VEVENT`,
    )
    .join("\n");
  const cal = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//APEX F1//Calendar//EN
CALSCALE:GREGORIAN
${events}
END:VCALENDAR`;
  return new NextResponse(cal, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="apex-f1-${sessionKey ?? meetingKey}.ics"`,
    },
  });
}
