import type { Envelope } from "@/lib/domain/types";
import type {
  F1DataProvider, LapQuery, ProviderCapabilities, SessionQuery, TelemetryQuery,
} from "../types";
import { sessionStatus } from "../openf1";
import { DRIVER_NATIONALITY_2026 } from "@/lib/assets/manifest";

/**
 * DemoDataProvider: serves a bundled snapshot of REAL historical OpenF1 data
 * (2026 Singapore Grand Prix, session 11388, captured 2026-10-17) plus the
 * full 2026 meeting/session lists. Everything it returns is labelled `demo`
 * so the UI can show the SIMULATED DEMO badge. It is used when the network
 * or provider is unavailable, and for tests.
 */
import meetings2026 from "./data/openf1-meetings-2026.json";
import sessions2026 from "./data/openf1-sessions-2026.json";
import drivers11388 from "./data/openf1-drivers-11388.json";
import laps11388 from "./data/openf1-laps-11388.json";
import stints11388 from "./data/openf1-stints-11388.json";
import pit11388 from "./data/openf1-pit-11388.json";
import weather11388 from "./data/openf1-weather-11388.json";
import raceControl11388 from "./data/openf1-racecontrol-11388.json";
import intervals11388 from "./data/openf1-intervals-11388.json";
import position11388 from "./data/openf1-position-11388.json";
import sessionResult11388 from "./data/openf1-sessionresult-11388.json";
import sessionResult11384 from "./data/openf1-sessionresult-11384.json";
import overtakes11388 from "./data/openf1-overtakes-11388.json";
import teamRadio11388 from "./data/openf1-teamradio-11388.json";
import carData3 from "./data/openf1-cardata-11388-3.json";
import carData16 from "./data/openf1-cardata-11388-16.json";
import location3 from "./data/openf1-location-11388-3.json";
import location16 from "./data/openf1-location-11388-16.json";

export const DEMO_SESSION_KEY = 11388;
export const DEMO_TELEMETRY_DRIVERS = [3, 16];

function env<T>(data: T, staleAfterMs = 86_400_000): Envelope<T> {
  return {
    data,
    provenance: {
      provider: "Bundled snapshot (OpenF1, captured 2026-10-17)",
      status: "demo",
      observedAt: null,
      retrievedAt: new Date().toISOString(),
      staleAfterMs,
    },
  };
}

/* eslint-disable @typescript-eslint/no-explicit-any */

export class DemoDataProvider implements F1DataProvider {
  readonly id = "demo";

  capabilities(): ProviderCapabilities {
    return {
      liveTiming: false, historicalTiming: true, telemetry: true,
      trackGeometry: true, weather: true, raceControl: true, officialResults: false,
    };
  }

  meetings(year: number) {
    const rows = (meetings2026 as any[]).filter((m) => m.year === year);
    return Promise.resolve(env(rows.map((m) => ({
      meetingKey: m.meeting_key, name: m.meeting_name,
      officialName: m.meeting_official_name ?? "", location: m.location,
      countryName: m.country_name, countryCode: m.country_code,
      countryFlagUrl: m.country_flag ?? null, circuitKey: m.circuit_key,
      circuitShortName: m.circuit_short_name, circuitType: m.circuit_type ?? null,
      circuitImageUrl: m.circuit_image ?? null, circuitInfoUrl: m.circuit_info_url ?? null,
      gmtOffset: m.gmt_offset, dateStart: m.date_start, dateEnd: m.date_end,
      year: m.year, isCancelled: m.is_cancelled ?? false,
    }))));
  }

  sessions(year: number) {
    const rows = (sessions2026 as any[]).filter((s) => s.year === year);
    return Promise.resolve(env(rows.map((s) => ({
      sessionKey: s.session_key, meetingKey: s.meeting_key, name: s.session_name,
      type: s.session_type, dateStart: s.date_start ?? "", dateEnd: s.date_end ?? "",
      gmtOffset: s.gmt_offset, circuitKey: s.circuit_key,
      circuitShortName: s.circuit_short_name, countryName: s.country_name,
      countryCode: s.country_code, location: s.location, year: s.year,
      isCancelled: s.is_cancelled ?? false, status: sessionStatus(s),
    }))));
  }

  drivers(q: SessionQuery) {
    const rows = (drivers11388 as any[]).filter((d) =>
      q.sessionKey === DEMO_SESSION_KEY ? d.session_key === DEMO_SESSION_KEY : false,
    );
    return Promise.resolve(env(rows.map((d) => ({
      driverNumber: d.driver_number, broadcastName: d.broadcast_name ?? "",
      fullName: d.full_name ?? "", firstName: d.first_name ?? "",
      lastName: d.last_name ?? "", acronym: d.name_acronym ?? "",
      teamName: d.team_name ?? "", teamColour: d.team_colour ?? "8a8f98",
      headshotUrl: d.headshot_url ?? null, countryCode: d.country_code ?? DRIVER_NATIONALITY_2026[d.driver_number] ?? null,
    }))));
  }

  laps(q: LapQuery) {
    if (q.sessionKey !== DEMO_SESSION_KEY) return Promise.resolve(env([]));
    let rows = laps11388 as any[];
    if (q.driverNumber != null) rows = rows.filter((l) => l.driver_number === q.driverNumber);
    if (q.lapNumber != null) rows = rows.filter((l) => l.lap_number === q.lapNumber);
    return Promise.resolve(env(rows.map((l) => ({
      driverNumber: l.driver_number, lapNumber: l.lap_number,
      dateStart: l.date_start ?? null, lapDuration: l.lap_duration ?? null,
      durationSector1: l.duration_sector_1 ?? null,
      durationSector2: l.duration_sector_2 ?? null,
      durationSector3: l.duration_sector_3 ?? null,
      i1Speed: l.i1_speed ?? null, i2Speed: l.i2_speed ?? null,
      stSpeed: l.st_speed ?? null, isPitOutLap: l.is_pit_out_lap ?? false,
      segmentsSector1: l.segments_sector_1 ?? [], segmentsSector2: l.segments_sector_2 ?? [],
      segmentsSector3: l.segments_sector_3 ?? [],
    }))));
  }

  stints(q: SessionQuery) {
    if (q.sessionKey !== DEMO_SESSION_KEY) return Promise.resolve(env([]));
    let rows = stints11388 as any[];
    if (q.driverNumber != null) rows = rows.filter((s) => s.driver_number === q.driverNumber);
    return Promise.resolve(env(rows.map((s) => ({
      driverNumber: s.driver_number, stintNumber: s.stint_number,
      lapStart: s.lap_start, lapEnd: s.lap_end, compound: s.compound ?? null,
      tyreAgeAtStart: s.tyre_age_at_start ?? 0,
    }))));
  }

  pitStops(q: SessionQuery) {
    if (q.sessionKey !== DEMO_SESSION_KEY) return Promise.resolve(env([]));
    let rows = pit11388 as any[];
    if (q.driverNumber != null) rows = rows.filter((p) => p.driver_number === q.driverNumber);
    return Promise.resolve(env(rows.map((p) => ({
      driverNumber: p.driver_number, date: p.date, lapNumber: p.lap_number,
      pitDuration: p.pit_duration ?? null,
    }))));
  }

  positions(q: SessionQuery) {
    if (q.sessionKey !== DEMO_SESSION_KEY) return Promise.resolve(env([]));
    let rows = position11388 as any[];
    if (q.driverNumber != null) rows = rows.filter((p) => p.driver_number === q.driverNumber);
    return Promise.resolve(env(rows.map((p) => ({
      driverNumber: p.driver_number, date: p.date, position: p.position,
    }))));
  }

  intervals(q: SessionQuery) {
    if (q.sessionKey !== DEMO_SESSION_KEY) return Promise.resolve(env([]));
    let rows = intervals11388 as any[];
    if (q.driverNumber != null) rows = rows.filter((i) => i.driver_number === q.driverNumber);
    return Promise.resolve(env(rows.map((i) => ({
      driverNumber: i.driver_number, date: i.date,
      gapToLeader: i.gap_to_leader ?? null, interval: i.interval ?? null,
    }))));
  }

  carData(q: TelemetryQuery) {
    if (q.sessionKey !== DEMO_SESSION_KEY) return Promise.resolve(env([]));
    const rows = q.driverNumber === 3 ? carData3 : q.driverNumber === 16 ? carData16 : [];
    return Promise.resolve(env((rows as any[]).map((c) => ({
      driverNumber: c.driver_number, date: c.date, speed: c.speed ?? null,
      rpm: c.rpm ?? null, nGear: c.n_gear ?? null, throttle: c.throttle ?? null,
      brake: c.brake ?? null, drs: c.drs ?? null,
    }))));
  }

  locations(q: TelemetryQuery) {
    if (q.sessionKey !== DEMO_SESSION_KEY) return Promise.resolve(env([]));
    const rows = q.driverNumber === 3 ? location3 : q.driverNumber === 16 ? location16 : [];
    return Promise.resolve(env((rows as any[]).map((l) => ({
      driverNumber: l.driver_number, date: l.date, x: l.x, y: l.y, z: l.z,
    }))));
  }

  weather(q: SessionQuery) {
    if (q.sessionKey !== DEMO_SESSION_KEY) return Promise.resolve(env([]));
    return Promise.resolve(env((weather11388 as any[]).map((w) => ({
      date: w.date, airTemperature: w.air_temperature ?? null,
      trackTemperature: w.track_temperature ?? null, humidity: w.humidity ?? null,
      pressure: w.pressure ?? null, windSpeed: w.wind_speed ?? null,
      windDirection: w.wind_direction ?? null, rainfall: w.rainfall ?? null,
    }))));
  }

  raceControl(q: SessionQuery) {
    if (q.sessionKey !== DEMO_SESSION_KEY) return Promise.resolve(env([]));
    return Promise.resolve(env((raceControl11388 as any[]).map((r) => ({
      date: r.date, category: r.category ?? null, flag: r.flag ?? null,
      scope: r.scope ?? null, sector: r.sector ?? null, message: r.message ?? "",
      lapNumber: r.lap_number ?? null, driverNumber: r.driver_number ?? null,
      source: "historical" as const,
    }))));
  }

  sessionResult(q: SessionQuery) {
    const rows = q.sessionKey === DEMO_SESSION_KEY ? sessionResult11388 : q.sessionKey === 11384 ? sessionResult11384 : [];
    return Promise.resolve(env((rows as any[]).map((r) => ({
      position: typeof r.position === "number" ? r.position : null, driverNumber: r.driver_number,
      numberOfLaps: r.number_of_laps ?? null, points: r.points ?? null,
      dnf: r.dnf ?? false, dns: r.dns ?? false, dsq: r.dsq ?? false,
      duration: Array.isArray(r.duration)
        ? (r.duration.filter((x: any) => typeof x === "number").length ? Math.min(...r.duration.filter((x: any) => typeof x === "number")) : null)
        : (typeof r.duration === "number" ? r.duration : null),
      gapToLeader: Array.isArray(r.gap_to_leader)
        ? (r.gap_to_leader.filter((x: any) => typeof x === "number").at(-1) ?? null)
        : (r.gap_to_leader ?? null),
    })).sort((a: any, b: any) => (a.position ?? 99) - (b.position ?? 99))));
  }

  startingGrid(q: SessionQuery) {
    // The OpenF1 starting_grid beta has no 2026 rows; the demo grid derives
    // from the qualifying classification of the same meeting (11384).
    if (q.sessionKey !== DEMO_SESSION_KEY) return Promise.resolve(env([]));
    return Promise.resolve(env((sessionResult11384 as any[])
      .filter((r) => typeof r.position === "number")
      .map((r) => ({
        position: r.position as number, driverNumber: r.driver_number,
        lapDuration: Array.isArray(r.duration)
          ? (r.duration.filter((x: any) => typeof x === "number").length ? Math.min(...r.duration.filter((x: any) => typeof x === "number")) : null)
          : (typeof r.duration === "number" ? r.duration : null),
      }))
      .sort((a: any, b: any) => a.position - b.position)));
  }

  overtakes(q: SessionQuery) {
    if (q.sessionKey !== DEMO_SESSION_KEY) return Promise.resolve(env([]));
    return Promise.resolve(env((overtakes11388 as any[]).map((o) => ({
      date: o.date, overtakingDriverNumber: o.overtaking_driver_number,
      overtakenDriverNumber: o.overtaken_driver_number, position: o.position,
    }))));
  }

  teamRadio(q: SessionQuery) {
    if (q.sessionKey !== DEMO_SESSION_KEY) return Promise.resolve(env([]));
    return Promise.resolve(env((teamRadio11388 as any[])
      .filter((t) => q.driverNumber == null || t.driver_number === q.driverNumber)
      .map((t) => ({ date: t.date, driverNumber: t.driver_number, recordingUrl: t.recording_url }))));
  }
}
