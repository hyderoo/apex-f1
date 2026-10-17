import type {
  Driver, Envelope, GridSlot, Overtake, Session, SessionResultEntry, TeamRadioClip,
} from "@/lib/domain/types";
import { withDemoFallback } from "@/lib/providers";
import { getSessionsForMeeting } from "./season";

export interface SessionExtras {
  result: Envelope<SessionResultEntry[]>;
  grid: Envelope<GridSlot[]> & { source: "starting_grid" | "qualifying" | "none" };
  overtakes: Envelope<Overtake[]>;
  teamRadio: Envelope<TeamRadioClip[]>;
  drivers: Driver[];
}

/**
 * Classification, starting grid, overtakes and team radio for one session.
 * Grid: OpenF1's starting_grid beta has no 2026 rows, so for race sessions we
 * fall back to the qualifying classification of the same meeting, labelled
 * as such. If neither exists the grid is honestly empty.
 */
export async function getSessionExtras(session: Session): Promise<SessionExtras> {
  const q = { sessionKey: session.sessionKey };
  const [result, gridRaw, overtakes, teamRadio, driverInfo] = await Promise.all([
    withDemoFallback((p) => p.sessionResult(q)),
    withDemoFallback((p) => p.startingGrid(q)),
    withDemoFallback((p) => p.overtakes(q)),
    withDemoFallback((p) => p.teamRadio(q)),
    withDemoFallback((p) => p.drivers(q)),
  ]);

  let grid: SessionExtras["grid"] = { ...gridRaw.envelope, source: "none" };
  if ((gridRaw.envelope.data?.length ?? 0) > 0) {
    // The demo snapshot has no starting_grid rows; its grid derives from
    // qualifying, and the label must say so.
    grid = { ...gridRaw.envelope, source: gridRaw.fellBack ? "qualifying" : "starting_grid" };
  } else if (session.type === "Race") {
    const siblings = await getSessionsForMeeting(session.meetingKey).catch(() => [] as Session[]);
    const quali = siblings
      .filter((s) => s.type === "Qualifying" && s.sessionKey !== session.sessionKey && s.status === "finished")
      .sort((a, b) => b.dateStart.localeCompare(a.dateStart))[0];
    if (quali) {
      const qr = await withDemoFallback((p) => p.sessionResult({ sessionKey: quali.sessionKey }));
      const slots: GridSlot[] = (qr.envelope.data ?? [])
        .filter((r) => r.position != null)
        .map((r) => ({ position: r.position!, driverNumber: r.driverNumber, lapDuration: r.duration }));
      if (slots.length) {
        grid = {
          ...qr.envelope,
          data: slots,
          provenance: {
            ...qr.envelope.provenance,
            provider: `${qr.envelope.provenance.provider} (qualifying classification)`,
          },
          source: "qualifying",
        };
      }
    }
  }

  return {
    result: result.envelope,
    grid,
    overtakes: overtakes.envelope,
    teamRadio: teamRadio.envelope,
    drivers: driverInfo.envelope.data ?? [],
  };
}
