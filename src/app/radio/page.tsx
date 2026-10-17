import { openF1 } from "@/lib/providers";
import { PageHeader } from "@/components/layout/page-header";
import { RadioExplorer } from "@/components/radio/radio-explorer";

export const metadata = { title: "Team Radio Archive" };
export const dynamic = "force-dynamic";

/** Seasons OpenF1 covers (verified against the sessions endpoint). */
const SEASONS = [2026, 2025, 2024, 2023];

export default async function RadioPage() {
  const years = await Promise.all(
    SEASONS.map(async (year) => {
      try {
        const [meetings, sessions] = await Promise.all([openF1.meetings(year), openF1.sessions(year)]);
        return {
          year,
          meetings: meetings.data ?? [],
          sessions: (sessions.data ?? []).filter((s) => s.status === "finished" || s.status === "live"),
        };
      } catch {
        return { year, meetings: [], sessions: [] };
      }
    }),
  );
  return (
    <div>
      <PageHeader
        eyebrow="Archive"
        title="Team Radio Archive"
        description="Recorded team radio clips from OpenF1 (2023 onwards), streamed from the provider-supplied F1 livetiming URLs. OpenF1 includes only a selection of communications, not the complete record. No transcripts exist in the source data."
      />
      <RadioExplorer years={years} />
    </div>
  );
}
